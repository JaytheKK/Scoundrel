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
      const result = resolveCard(cardId);
      if (!result) return;
      renderHp();
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

  const result = resolveCard(cardId, options);
  if (!result) return;

  renderHp();
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

document.getElementById('room').addEventListener('click', (event) => {
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

document.getElementById('new-game-btn').addEventListener('click', () => {
  initGame();
  renderAll();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  initGame();
  renderAll();
});
