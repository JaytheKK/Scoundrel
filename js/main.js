// ---------------------------------------------------------------------------
// Scoundrel — wiring: connects clicks/buttons to state.js and triggers
// re-renders via ui.js.
// ---------------------------------------------------------------------------

// Keep in sync with the .card--resolved transition duration in style.css.
const CARD_ANIMATION_MS = 280;

function handleCardClick(cardId) {
  if (state.gameOver) return;

  // Play the "resolve" animation on the clicked card immediately...
  const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
  if (cardEl) cardEl.classList.add('card--resolved');

  const result = resolveCard(cardId);
  if (!result) return;

  renderHp();
  renderWeaponSlot();
  renderMessage(result.message);

  // ...then re-render the room (removing/replacing cards) once the
  // animation has had time to finish, so it doesn't get cut short.
  setTimeout(() => {
    renderRoom();
    renderDeckCount();
  }, CARD_ANIMATION_MS);
}

document.getElementById('room').addEventListener('click', (event) => {
  const cardEl = event.target.closest('.card');
  if (!cardEl) return;
  handleCardClick(cardEl.dataset.id);
});

document.getElementById('new-game-btn').addEventListener('click', () => {
  initGame();
  renderAll();
});
