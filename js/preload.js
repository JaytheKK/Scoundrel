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
// Comfortably longer than any real asset should ever take, even on a slow
// connection, since every image here is a small PNG.
const PRELOAD_TIMEOUT_MS = 8000;

/** Card-frame artwork (the illustrated monster/weapon/shield/potion/champion
 * borders, see "Card frame artwork" in CLAUDE.md) is applied purely via CSS
 * `background-image`/`mask-image` (style.css), never touched by a JS
 * `new Image()` call anywhere. A browser only fetches a CSS background image
 * once a rule actually applies to a rendered element, not just because the
 * rule exists in the stylesheet, so these were never warmed by the loading
 * screen at all: the very first .card--weapon (or the Weapons/Shields/
 * Monsters/Champions gallery, or champion-select) shown after the loading
 * screen finished was still fetching its own frame PNG from scratch, which
 * is exactly the "cards still loading after the loading screen" symptom
 * this list exists to prevent. Hand-listed here (not derived from data)
 * since these paths don't come from any per-card/per-champion field. */
const FRAME_IMAGE_URLS = [
  'images/frames/monster.png',
  'images/frames/weapon.png',
  'images/frames/shield.png',
  'images/frames/potion.png',
  'images/frames/champion.png',
];

/** The empty weapon/shield slot icons (SwordSymbolTransparent.png/
 * ShieldSymbolTransparent.png in images/symbols/) are also applied purely
 * via a hand-written <img>/CSS reference (renderWeaponSlot()/
 * renderShieldSlot() in ui.js, not read from any card/champion data field),
 * so like FRAME_IMAGE_URLS they need to be hand-listed here too. The 4
 * weapon-effect badge images (WEAPON_EFFECTS in weapon-effects.js) ARE data
 * fields already, so those are picked up automatically below instead. */
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
  FRAME_IMAGE_URLS.forEach((url) => urls.add(url));
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
