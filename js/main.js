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

  // If the equipped weapon is legal to use on this monster, let the player
  // choose bare hands vs. weapon (using it changes the weapon's restriction
  // for later monsters, so it's a real choice).
  if (card.type === 'monster' && isWeaponUsableOn(card)) {
    showFightChoice(card, (useWeapon) => resolveAndAnimate(cardId, { useWeapon }));
    return;
  }

  resolveAndAnimate(cardId);
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

document.getElementById('new-game-btn').addEventListener('click', () => {
  initGame();
  renderAll();
});
