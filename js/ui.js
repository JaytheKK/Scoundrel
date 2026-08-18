// ---------------------------------------------------------------------------
// Scoundrel — rendering only. Reads `state` from state.js and draws it to the
// DOM. Contains no game rules — clicks are wired up in main.js, which calls
// into state.js and then asks this file to re-render.
// ---------------------------------------------------------------------------

function renderCard(card) {
  const el = document.createElement('div');
  el.className = `card card--${card.type}`;
  el.dataset.suit = card.suit;
  el.dataset.id = card.id;
  el.title = card.name;

  if (card.image) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = card.image;
    img.alt = card.name;
    el.appendChild(img);
  } else {
    const symbol = document.createElement('div');
    symbol.className = 'card-suit-symbol';
    symbol.textContent = SUIT_SYMBOLS[card.suit];
    el.appendChild(symbol);
  }

  const rank = document.createElement('div');
  rank.className = 'card-rank';
  rank.textContent = card.label;
  el.appendChild(rank);

  const typeLabel = document.createElement('div');
  typeLabel.className = 'card-type-label';
  typeLabel.textContent = card.type;
  el.appendChild(typeLabel);

  return el;
}

function renderRoom() {
  const roomEl = document.getElementById('room');
  roomEl.innerHTML = '';
  state.room.forEach((card) => roomEl.appendChild(renderCard(card)));
}

function renderDeckCount() {
  document.getElementById('deck-count').textContent = `Deck: ${state.deck.length} cards left`;
}

function renderHp() {
  const pct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
  document.getElementById('hp-fill').style.width = `${pct}%`;
  document.getElementById('hp-text').textContent = `${state.hp} / ${state.maxHp} HP`;
}

function renderWeaponSlot() {
  const el = document.getElementById('weapon-slot');
  if (!state.equippedWeapon) {
    el.textContent = 'Weapon: none';
    return;
  }
  const restriction =
    state.weaponMaxMonster === null
      ? 'fresh — usable on any monster'
      : `usable on monsters weaker than ${state.weaponMaxMonster}`;
  el.textContent = `Weapon: ${state.equippedWeapon.name} (${restriction})`;
}

function renderMessage(text) {
  const el = document.getElementById('message');
  el.textContent = text || '';
  el.classList.toggle('message--won', state.outcome === 'won');
  el.classList.toggle('message--lost', state.outcome === 'lost');
}

function renderFleeButton() {
  const btn = document.getElementById('flee-btn');
  const canFlee = !state.gameOver && state.room.length === 4 && !state.fledLastRoom;
  btn.disabled = !canFlee;
  btn.title = state.fledLastRoom
    ? "Can't flee two rooms in a row"
    : state.room.length !== 4
      ? 'Can only flee a full, untouched room'
      : '';
}

function renderAll() {
  renderHp();
  renderRoom();
  renderDeckCount();
  renderWeaponSlot();
  renderFleeButton();
  renderMessage('');
}

// --- fight-choice modal ---------------------------------------------------

/** Shows a small modal asking the player to fight a monster with their
 * equipped weapon or bare-handed, previewing the damage of each option.
 * Calls onChoice(useWeapon: boolean) once the player picks. */
function showFightChoice(card, onChoice) {
  const overlay = document.getElementById('modal-overlay');
  const text = document.getElementById('modal-text');
  const actions = document.getElementById('modal-actions');

  const weaponDamage = Math.max(card.rank - state.equippedWeapon.rank, 0);

  text.textContent = `${card.name} (strength ${card.rank}) — how do you want to fight?`;
  actions.innerHTML = '';

  const weaponBtn = document.createElement('button');
  weaponBtn.className = 'modal-btn';
  weaponBtn.textContent = `${state.equippedWeapon.name} — ${weaponDamage} dmg`;
  weaponBtn.addEventListener('click', () => {
    hideFightChoice();
    onChoice(true);
  });

  const bareBtn = document.createElement('button');
  bareBtn.className = 'modal-btn';
  bareBtn.textContent = `Bare hands — ${card.rank} dmg`;
  bareBtn.addEventListener('click', () => {
    hideFightChoice();
    onChoice(false);
  });

  actions.appendChild(weaponBtn);
  actions.appendChild(bareBtn);
  overlay.classList.remove('hidden');
}

function hideFightChoice() {
  document.getElementById('modal-overlay').classList.add('hidden');
}
