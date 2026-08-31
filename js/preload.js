// ---------------------------------------------------------------------------
// Scoundrel - asset preloader + loading screen.
//
// Opening index.html locally via file:// loads every image instantly, so
// this problem never showed up during dev. Once hosted, images arrive over
// a real network connection, so cards/portraits used to visibly pop in
// blank-then-loaded during a fresh game as the browser fetched each PNG
// lazily on first render. This preloads every piece of card/champion/
// ability artwork the game can show, behind #loading-screen (index.html),
// so by the time the start screen appears every image is already sitting in
// the browser's cache and renders instantly from then on.
//
// Deliberately its own last-loaded script rather than folded into main.js:
// it only needs read access to data already defined by the earlier scripts
// (CARD_LIST, CHAMPIONS, ABILITY_ICONS), no game or rendering logic of its
// own, so it stays out of main.js's "wiring" role.
// ---------------------------------------------------------------------------

// If a single image somehow never fires load or error (a stalled request,
// not a fast 404), don't trap the player behind the loading screen forever.
// Bumped from an earlier 8000: at that value, a handful of oversized source
// PNGs (the 4 champion portraits and the champion card frame were each
// still 5-8.6MB straight out of the crop pipeline, tens of MB combined
// across the full preload set) meant a real network connection could still
// be mid-download when the timeout fired, which reveals the start screen
// with those images still loading, exactly the "buttons/cards briefly
// unstyled" symptom this whole preloader exists to prevent. Those source
// images have since been resized/recompressed down to what they're ever
// actually displayed at (a few hundred px, see the champion portrait/frame
// crop notes in CLAUDE.md), which should comfortably finish well inside
// this window on any real connection, but the timeout itself is kept
// generous as a safety net regardless, it should only ever fire for a
// genuinely stalled request, not as the normal path.
const PRELOAD_TIMEOUT_MS = 15000;

/** Any image applied purely via CSS (`background-image`, `border-image-
 * source`, `mask-image`/`-webkit-mask-image`, ...) is never touched by a JS
 * `new Image()` call anywhere in the game's own code, which matters because
 * a browser only actually fetches a CSS-referenced image once a matching
 * rule applies to a rendered element, not just because the rule exists in
 * the stylesheet. Left off the preload list, an image like this pops in
 * blank-then-loaded well after the loading screen has already declared
 * itself done, e.g. the illustrated card/champion frames (`images/frames/
 * *.png`), or, found later via a live screenshot of lastdeckstanding.com,
 * the button-plaque artwork every single start-screen button depends on
 * (`button-primary.png`/`button-secondary.png`) — that one was especially
 * bad since it meant literally every button on the very first screen a
 * player sees rendered with no artwork at all, just a plain fallback
 * bevel, for however long those two files took to fetch afterward.
 *
 * Rather than hand-list every such path (which is exactly how the button
 * plaque artwork got missed the first time, a hand-list only ever covers
 * what someone remembered to add to it the day it was written), this scans
 * the already-parsed `style.css` stylesheet itself via `document.
 * styleSheets` for every `url(...)` that points under `images/`, so any
 * future CSS-only image reference is automatically covered with nothing
 * new to remember here. */
function collectCssImageUrls() {
  const urls = new Set();
  const urlPattern = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;

  function scanRules(rules) {
    if (!rules) return;
    Array.from(rules).forEach((rule) => {
      // Always scan this rule's own cssText for url(...) first, whether or
      // not it also happens to be a grouping rule (see below) — a plain
      // CSSStyleRule's cssText is just its own declarations, e.g.
      // "#foo { background-image: url(...); }", so this covers the common
      // case on its own.
      const cssText = rule.cssText || '';
      let match;
      while ((match = urlPattern.exec(cssText))) {
        const url = match[1];
        if (url.startsWith('images/')) urls.add(url);
      }
      // Grouping rules (@media, @supports, @keyframes, ...) hold their own
      // nested rule list, which needs a separate recursive pass. Gotcha:
      // a plain CSSStyleRule can ALSO carry a non-null (possibly just
      // empty) `cssRules` in browsers with CSS-nesting support, so this
      // can't be an `if (rule.cssRules) { ...; return; }` early-exit
      // instead of the unconditional scan above, an early return there
      // would skip a plain rule's own cssText entirely the moment the
      // browser started exposing that property, which is exactly what
      // happened here the first time this was written: every CSS-only
      // image (including every start-screen button's border-image) came
      // back as zero results despite the stylesheet plainly containing
      // them, because every single rule looked like a "grouping rule" and
      // got recursed into (finding nothing, since there was nothing
      // nested) instead of ever being read itself.
      if (rule.cssRules && rule.cssRules.length > 0) {
        scanRules(rule.cssRules);
      }
    });
  }

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      scanRules(sheet.cssRules);
    } catch (e) {
      // A cross-origin stylesheet throws reading cssRules; this project
      // never links one, so this is purely defensive and should never
      // actually trigger, but skip it rather than let one bad stylesheet
      // abort preloading everything else.
    }
  });

  return urls;
}

/** The empty weapon/shield slot icons (SwordSymbolTransparent.png/
 * ShieldSymbolTransparent.png in images/symbols/) are applied via a
 * hand-written `<img>` string in `renderWeaponSlot()`/`renderShieldSlot()`
 * (js/ui.js), not via CSS and not from any card/champion data field, so
 * `collectCssImageUrls()` above can't see them and they still need to be
 * hand-listed here. Everything that *is* pure CSS should go through the
 * automatic scan instead of being added to a list like this one. */
const SYMBOL_IMAGE_URLS = [
  'images/symbols/SwordSymbolTransparent.png',
  'images/symbols/ShieldSymbolTransparent.png',
];

/** Every image URL the game can ever display, gathered straight from the
 * existing data rather than a separately hand-maintained list, so a newly
 * added card, champion, or ability is automatically preloaded too, nothing
 * new to keep in sync here. Deduplicated via Set (cheap insurance, several
 * cards already do intentionally share a path per rank). A null image field
 * (no artwork yet, e.g. a brand new champion, see champion-icons.js) is
 * skipped rather than preloaded as a request to nothing. */
function collectPreloadImageUrls() {
  const urls = new Set();
  CARD_LIST.forEach((card) => {
    if (card.image) urls.add(card.image);
  });
  CHAMPIONS.forEach((champion) => {
    if (champion.image) urls.add(champion.image);
  });
  Object.values(ABILITY_ICONS).forEach((url) => {
    if (url) urls.add(url);
  });
  WEAPON_EFFECT_IDS.forEach((id) => {
    if (WEAPON_EFFECTS[id].image) urls.add(WEAPON_EFFECTS[id].image);
  });
  collectCssImageUrls().forEach((url) => urls.add(url));
  SYMBOL_IMAGE_URLS.forEach((url) => urls.add(url));
  return Array.from(urls);
}

/** Resolves once `url` has either loaded or failed. Either way is fine here,
 * a broken/missing image shouldn't hang the loading screen, it just won't
 * be warm in the cache, same as if this preloader didn't exist at all. */
function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
}

function runPreload() {
  const loadingScreen = document.getElementById('loading-screen');
  const startScreen = document.getElementById('start-screen');
  const fill = document.getElementById('loading-fill');
  const text = document.getElementById('loading-text');

  const urls = collectPreloadImageUrls();
  const total = urls.length;
  let loaded = 0;
  let finished = false;

  function updateProgress() {
    const pct = total === 0 ? 100 : Math.round((loaded / total) * 100);
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = t('loadingText', { pct });
  }

  function finish() {
    if (finished) return;
    finished = true;
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (startScreen) startScreen.classList.remove('hidden');
  }

  updateProgress();

  if (total === 0) {
    finish();
    return;
  }

  setTimeout(finish, PRELOAD_TIMEOUT_MS);

  urls.forEach((url) => {
    preloadImage(url).then(() => {
      loaded += 1;
      updateProgress();
      if (loaded === total) finish();
    });
  });
}

runPreload();
