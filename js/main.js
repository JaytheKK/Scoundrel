// ---------------------------------------------------------------------------
// Scoundrel — wiring: connects clicks/buttons to state.js and triggers
// re-renders via ui.js.
// ---------------------------------------------------------------------------

// Keep in sync with the .card--resolved transition duration in style.css.
const CARD_ANIMATION_MS = 280;

function handleCardClick(cardId) {
  if (state.gameOver) return;

  const card = state.room.find((c) => c.id === cardId);
  if (!card) return;

  // Weapons fly into the weapon slot instead of fading down like other cards.
  if (card.type === 'weapon') {
    const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
    if (!cardEl) return;
    animateWeaponToSlot(cardEl, () => {
      const hpBefore = state.hp;
      const result = resolveCard(cardId);
      if (!result) return;
      renderHp();
      showHpDelta(state.hp - hpBefore);
      renderWeaponSlot();
      renderMessage(result.message);
      renderRoom();
      renderDeckCount();
      renderFleeButton();
      renderGameOverBanner();
    });
    return;
  }

  // Monsters use the equipped weapon automatically whenever the "Using
  // weapon" toggle is on and the weapon is legal to use on them; no per-fight
  // prompt.
  resolveAndAnimate(cardId, { useWeapon: state.useWeaponPreference });
}

function resolveAndAnimate(cardId, options) {
  // Play the "resolve" animation on the clicked card immediately...
  const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
  if (cardEl) cardEl.classList.add('card--resolved');

  const hpBefore = state.hp;
  const result = resolveCard(cardId, options);
  if (!result) return;

  renderHp();
  showHpDelta(state.hp - hpBefore);
  renderWeaponSlot();
  renderMessage(result.message);

  // ...then re-render the room (removing/replacing cards) once the
  // animation has had time to finish, so it doesn't get cut short.
  setTimeout(() => {
    renderRoom();
    renderDeckCount();
    renderFleeButton();
    renderGameOverBanner();
  }, CARD_ANIMATION_MS);
}

/** Shared by every "start a new game" entry point: the menu's New Game
 * button, the game-over screen's Play Again button, and the call-to-action
 * shown in the room before the first game / after the dungeon ends. */
function startNewGame() {
  initGame();
  renderAll();
  closeMenu();
}

document.getElementById('room').addEventListener('click', (event) => {
  if (event.target.closest('#room-start-btn')) {
    startNewGame();
    return;
  }
  const cardEl = event.target.closest('.card');
  if (!cardEl) return;
  handleCardClick(cardEl.dataset.id);
});

document.getElementById('flee-btn').addEventListener('click', () => {
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

document.getElementById('new-game-btn').addEventListener('click', startNewGame);
document.getElementById('play-again-btn').addEventListener('click', startNewGame);

// --- hamburger menu (New Game + rules) --------------------------------------

function openMenu() {
  document.getElementById('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
  document.getElementById('menu-overlay').classList.add('hidden');
}

document.getElementById('menu-btn').addEventListener('click', openMenu);
document.getElementById('menu-close-btn').addEventListener('click', closeMenu);

// Clicking the dimmed backdrop (not the panel itself) closes the menu.
document.getElementById('menu-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'menu-overlay') closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

// --- initial page load -------------------------------------------------------
// state starts with an empty room (no game started yet); render that empty
// state (the New Game call-to-action) and the flee button's disabled look
// instead of relying on the static HTML markup to already match it.
renderRoom();
renderFleeButton();
renderWeaponSlot();
