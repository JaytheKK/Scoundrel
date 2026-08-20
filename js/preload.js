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
// (CARD_LIST, SHIELD_DAMAGED_IMAGES, CHAMPIONS, ABILITY_ICONS), no game or
// rendering logic of its own, so it stays out of main.js's "wiring" role.
// ---------------------------------------------------------------------------

// If a single image somehow never fires load or error (a stalled request,
// not a fast 404), don't trap the player behind the loading screen forever.
// Comfortably longer than any real asset should ever take, even on a slow
// connection, since every image here is a small PNG.
const PRELOAD_TIMEOUT_MS = 8000;

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
  Object.values(SHIELD_DAMAGED_IMAGES).forEach((url) => urls.add(url));
  CHAMPIONS.forEach((champion) => {
    if (champion.image) urls.add(champion.image);
  });
  Object.values(ABILITY_ICONS).forEach((url) => {
    if (url) urls.add(url);
  });
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
    if (text) text.textContent = `Loading... ${pct}%`;
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
