// ---------------------------------------------------------------------------
// Scoundrel — wiring: connects clicks/buttons to state.js and triggers
// re-renders via ui.js.
// ---------------------------------------------------------------------------

// Keep in sync with the .card--resolved transition duration in style.css.
const CARD_ANIMATION_MS = 280;

// --- action queue -------------------------------------------------------------
// Every room-card click (fight/equip/drink) is routed through this queue so
// their animations never overlap or interleave — clicking rapidly used to
// look broken because a second click's state change (card gone, HP lost,
// weapon-slot updated) could land while the first click's animation was
// still mid-flight. Now a click's actual effect only ever happens once its
// own animation has fully played out, and the next queued click only starts
// once that happens.
//
// So the queue doesn't feel sluggish, a click that arrives while a previous
// one is still animating doesn't jump the queue or cut the current animation
// short — instead the *currently playing* animation is nudged to finish at
// double speed (see speedUpCurrentAction below; each animation's own
// speedUp() controller, from ui.js, makes sure this never causes a visual
// jump). Further clicks while it's already sped up don't stack — a swing
// only ever goes up to 2x.
const actionQueue = [];
let queueBusy = false;
let speedUpCurrentAction = null;

/** Queues `run` to execute once every action ahead of it has finished.
 * `run(registerSpeedUp, onFinished)` — the action calls `registerSpeedUp`
 * with whatever function should currently fast-forward it (an action with
 * multiple animation legs may call this more than once, to hand over the
 * baton as it moves from one leg to the next), and must call `onFinished()`
 * itself once its animation and every resulting state/UI change is
 * completely done. */
function enqueueRoomAction(run) {
  actionQueue.push(run);
  if (queueBusy) {
    if (speedUpCurrentAction) speedUpCurrentAction();
  } else {
    runNextQueuedAction();
  }
}

function runNextQueuedAction() {
  const run = actionQueue.shift();
  if (!run) {
    queueBusy = false;
    speedUpCurrentAction = null;
    return;
  }
  queueBusy = true;
  speedUpCurrentAction = null;
  run(
    (speedUpFn) => {
      speedUpCurrentAction = speedUpFn;
    },
    () => {
      speedUpCurrentAction = null;
      runNextQueuedAction();
    }
  );
}

function handleCardClick(cardId) {
  if (state.gameOver) return;
  // Validate against the room now, at click time — a click on a card that's
  // already gone by the time it reaches the front of the queue (e.g. it was
  // the same card double-clicked) is silently dropped there instead.
  if (!state.room.some((c) => c.id === cardId)) return;

  enqueueRoomAction((registerSpeedUp, onFinished) => {
    const card = state.room.find((c) => c.id === cardId);
    const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
    if (!card || !cardEl) {
      onFinished();
      return;
    }

    // Weapons fly into the weapon slot instead of fading down like other cards.
    if (card.type === 'weapon') {
      const ctl = animateWeaponToSlot(cardEl, () => {
        applyResolve(cardId, {});
        renderRoom();
        renderDeckCount();
        renderFleeButton();
        renderGameOverBanner();
        onFinished();
      });
      registerSpeedUp(ctl.speedUp);
      return;
    }

    // Monsters use the equipped weapon automatically whenever the "Using
    // weapon" toggle is on and the weapon is legal to use on them; no
    // per-fight prompt.
    resolveAndAnimate(cardId, { useWeapon: state.useWeaponPreference }, registerSpeedUp, onFinished);
  });
}

/** Actually applies a resolved card's effect to `state` and updates every
 * piece of UI that isn't the room itself (HP, weapon slot, message, any
 * per-card "-1" feedback) — shared by the plain fade-resolve path and the
 * weapon-attack path below, so both end up with identical state handling. */
function applyResolve(cardId, options) {
  const hpBefore = state.hp;
  const result = resolveCard(cardId, options);
  if (!result) return null;

  renderHp();
  showHpDelta(state.hp - hpBefore);
  renderWeaponSlot();
  renderMessage(result.message);

  // Electric weapon effect: play a "-1" + shake on each monster it weakened,
  // while their card elements are still the ones actually in the DOM.
  if (result.weakenedIds && result.weakenedIds.length) {
    result.weakenedIds.forEach((id) => {
      const weakenedEl = document.querySelector(`.card[data-id="${id}"]`);
      if (!weakenedEl) return;
      showCardDamage(weakenedEl, -1);
      weakenedEl.classList.add('card--shake');
    });
  }

  return result;
}

/** @param registerSpeedUp/onFinished — this action's handle into the queue
 * in enqueueRoomAction() above; see the comment there. */
function resolveAndAnimate(cardId, options, registerSpeedUp, onFinished) {
  const card = state.room.find((c) => c.id === cardId);
  const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);

  // Fighting a monster with the equipped weapon (and only then — bare-handed
  // fights, potions, etc. keep the plain fade-resolve below) gets its own
  // "weapon swings out and back" animation instead of just fading in place.
  const willUseWeapon =
    cardEl && card && card.type === 'monster' && options.useWeapon && isWeaponUsableOn(card);

  if (willUseWeapon) {
    const ctl = animateWeaponAttack(
      cardEl,
      () => {
        // The state change (damage, message, etc.) lands right as the weapon
        // visually connects, then the card fades the same way any other
        // resolved card does.
        cardEl.classList.add('card--resolved');
        applyResolve(cardId, options);

        const fadeTimer = speedableTimeout(() => {
          renderRoom();
          renderDeckCount();
          renderFleeButton();
          renderGameOverBanner();
        }, CARD_ANIMATION_MS);
        registerSpeedUp(fadeTimer.speedUp);
      },
      () => {
        // The weapon has fully swung back into the slot — only now is this
        // action considered done, so the next queued click can start.
        onFinished();
      }
    );
    registerSpeedUp(ctl.speedUp);
    return;
  }

  // Play the "resolve" animation on the clicked card immediately...
  if (cardEl) cardEl.classList.add('card--resolved');
  if (!applyResolve(cardId, options)) {
    onFinished();
    return;
  }

  // ...then re-render the room (removing/replacing cards) once the
  // animation has had time to finish, so it doesn't get cut short.
  const fadeTimer = speedableTimeout(() => {
    renderRoom();
    renderDeckCount();
    renderFleeButton();
    renderGameOverBanner();
    onFinished();
  }, CARD_ANIMATION_MS);
  registerSpeedUp(fadeTimer.speedUp);
}

/** Shared by every "start a new game" entry point: the start screen's New
 * Game button, the menu's New Game button, the game-over screen's Play
 * Again button, and the call-to-action shown in the room before the first
 * game / after the dungeon ends. None of those call this directly anymore —
 * they all open the champion-select screen first (see openChampionSelect()
 * below); this only actually runs once a champion tile is clicked there, so
 * `championId` is always set by the time this runs. Starting over abandons
 * whatever's mid-animation rather than waiting for it, so the queue is
 * dropped and any leftover inline styles from an interrupted weapon-attack
 * (see animateWeaponAttack in ui.js) are cleared by hand — renderWeaponSlot()
 * (called via renderAll below) only ever touches className/innerHTML, not
 * those. */
function startNewGame(championId) {
  actionQueue.length = 0;
  queueBusy = false;
  speedUpCurrentAction = null;
  const slot = document.getElementById('weapon-slot-card');
  slot.style.transition = '';
  slot.style.transform = '';
  slot.style.zIndex = '';
  slot.style.position = '';

  initGame(championId);
  renderAll();
  closeChampionSelect();
  closeMenu();
  showGameScreen();
}

// --- start screen / game screen switching -----------------------------------

function showStartScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

function showGameScreen() {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
}

document.getElementById('room').addEventListener('click', (event) => {
  if (event.target.closest('#room-start-btn')) {
    openChampionSelect();
    return;
  }
  const cardEl = event.target.closest('.card');
  if (!cardEl) return;
  handleCardClick(cardEl.dataset.id);
});

document.getElementById('flee-btn').addEventListener('click', () => {
  // Fleeing replaces the whole room; doing that while a queued card is
  // mid-animation (see the action queue above) would pull the rug out from
  // under it, so it's ignored until the queue is idle again — same as
  // clicking a card is, just without a visible queued click to speed
  // anything up.
  if (queueBusy) return;

  const result = fleeRoom();
  if (!result) return;
  renderMessage(result.message);
  renderRoom();
  renderDeckCount();
  renderFleeButton();
});

document.getElementById('weapon-toggle').addEventListener('change', (event) => {
  state.useWeaponPreference = event.target.checked;
  renderWeaponSlot();
});

// Every "New Game" entry point opens the champion-select screen instead of
// starting straight away — startNewGame() only runs once a champion tile is
// actually clicked there (see the champion-select wiring further down).
document.getElementById('new-game-btn').addEventListener('click', openChampionSelect);
document.getElementById('play-again-btn').addEventListener('click', openChampionSelect);
document.getElementById('start-new-game-btn').addEventListener('click', openChampionSelect);

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  closeMenu();
  showStartScreen();
});

// --- hamburger menu (New Game + rules) --------------------------------------

function openMenu(fromGame = true) {
  // "New Game" only makes sense when opened from the in-game hamburger menu
  // (#menu-btn) — the start screen's own "Anleitung" button reuses this same
  // overlay just for the rules text, so it hides the button in that case.
  document.getElementById('new-game-btn').classList.toggle('hidden', !fromGame);
  document.getElementById('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
  document.getElementById('menu-overlay').classList.add('hidden');
}

document.getElementById('menu-btn').addEventListener('click', () => openMenu(true));
document.getElementById('menu-close-btn').addEventListener('click', closeMenu);

// Clicking the dimmed backdrop (not the panel itself) closes the menu.
document.getElementById('menu-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'menu-overlay') closeMenu();
});

// --- start screen galleries (Champions/Weapons/Monsters) + Anleitung -------
// "Anleitung" reuses the same rules overlay as the in-game hamburger menu
// (#menu-overlay) rather than duplicating the rules text anywhere else.

function openGallery(kind) {
  renderGallery(kind);
  document.getElementById('gallery-overlay').classList.remove('hidden');
}

function closeGallery() {
  document.getElementById('gallery-overlay').classList.add('hidden');
}

document.getElementById('champions-btn').addEventListener('click', () => openGallery('champions'));
document.getElementById('weapons-btn').addEventListener('click', () => openGallery('weapons'));
document.getElementById('monsters-btn').addEventListener('click', () => openGallery('monsters'));
document.getElementById('anleitung-btn').addEventListener('click', () => openMenu(false));

document.getElementById('gallery-close-btn').addEventListener('click', closeGallery);

// Clicking the dimmed backdrop (not the panel itself) closes the gallery.
document.getElementById('gallery-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'gallery-overlay') closeGallery();
});

// --- gallery item detail popup (click a weapon/monster tile) ---------------
// Sits on top of #gallery-overlay rather than replacing it, so closing the
// detail popup leaves the gallery grid open behind it.

function openGalleryDetail(kind, rank) {
  renderGalleryDetail(kind, rank);
  document.getElementById('gallery-detail-overlay').classList.remove('hidden');
}

function closeGalleryDetail() {
  document.getElementById('gallery-detail-overlay').classList.add('hidden');
}

// Delegated on the grid rather than one listener per tile, since the grid's
// contents are fully rebuilt every time renderGallery() runs. Weapons/
// monsters key off a numeric rank; champions key off their string id (see
// buildGalleryItem() in js/ui.js) — only the former should be coerced to a
// Number.
document.getElementById('gallery-grid').addEventListener('click', (event) => {
  const item = event.target.closest('.gallery-item');
  if (!item) return;
  const kind = item.dataset.kind;
  const key = kind === 'champions' ? item.dataset.key : Number(item.dataset.key);
  openGalleryDetail(kind, key);
});

document.getElementById('gallery-detail-close-btn').addEventListener('click', closeGalleryDetail);

document.getElementById('gallery-detail-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'gallery-detail-overlay') closeGalleryDetail();
});

// --- champion-select screen --------------------------------------------------
// Shown whenever a new game is started (see every "New Game"/"Play Again"
// listener above, and the room's empty-state CTA) — the actual game only
// starts once a champion tile is clicked here (see the delegated click
// handler below), which calls startNewGame(championId).

function openChampionSelect() {
  renderChampionSelect();
  document.getElementById('champion-select-overlay').classList.remove('hidden');
}

function closeChampionSelect() {
  document.getElementById('champion-select-overlay').classList.add('hidden');
}

// Delegated on the grid rather than one listener per tile, since the grid's
// contents are fully rebuilt every time renderChampionSelect() runs.
document.getElementById('champion-select-grid').addEventListener('click', (event) => {
  const item = event.target.closest('.champion-select-item');
  if (!item) return;
  startNewGame(item.dataset.championId);
});

document.getElementById('champion-select-close-btn').addEventListener('click', closeChampionSelect);

// Clicking the dimmed backdrop (not the panel itself) closes champion-select
// without starting a game — same as the menu/gallery overlays.
document.getElementById('champion-select-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'champion-select-overlay') closeChampionSelect();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    closeGalleryDetail();
    closeGallery();
    closeChampionSelect();
  }
});

// --- initial page load -------------------------------------------------------
// state starts with an empty room (no game started yet); render that empty
// state (the New Game call-to-action) and the flee button's disabled look
// instead of relying on the static HTML markup to already match it.
renderRoom();
renderFleeButton();
renderWeaponSlot();
