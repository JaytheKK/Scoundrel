// ---------------------------------------------------------------------------
// Scoundrel — rendering only. Reads `state` from state.js and draws it to the
// DOM. Contains no game rules — clicks are wired up in main.js, which calls
// into state.js and then asks this file to re-render.
// ---------------------------------------------------------------------------

/** Fills a card-shaped element with a card's face (image or suit/rank
 * placeholder + type label). Shared by renderCard() and the weapon slot,
 * which displays the equipped weapon the same way. */
function fillCardFace(el, card) {
  el.innerHTML = '';

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
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = `card card--${card.type}`;
  el.dataset.suit = card.suit;
  el.dataset.id = card.id;
  el.title = card.name;
  fillCardFace(el, card);
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
  const slot = document.getElementById('weapon-slot-card');
  const status = document.getElementById('weapon-status');

  if (!state.equippedWeapon) {
    slot.className = 'card weapon-slot-empty';
    delete slot.dataset.suit;
    slot.innerHTML = '<div class="sword-icon">⚔</div>';
  } else {
    slot.className = 'card card--weapon';
    slot.dataset.suit = state.equippedWeapon.suit;
    fillCardFace(slot, state.equippedWeapon);
  }

  // Grayed out whenever the toggle is off, so it's visually obvious you're
  // fighting bare-handed right now regardless of what's equipped.
  slot.classList.toggle('weapon-slot-inactive', !state.useWeaponPreference);

  if (!state.useWeaponPreference) {
    status.textContent = 'Fighting bare-handed';
  } else if (!state.equippedWeapon) {
    status.textContent = 'No weapon equipped';
  } else {
    status.textContent =
      state.weaponMaxMonster === null
        ? 'Can defeat any monster'
        : `Can only defeat monsters weaker than ${state.weaponMaxMonster}`;
  }
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

/** Shows/hides the full-screen Victory/Defeat banner based on state.gameOver
 * + state.outcome. Safe to call after every state change. */
function renderGameOverBanner() {
  const overlay = document.getElementById('gameover-overlay');

  if (!state.gameOver) {
    overlay.classList.add('hidden');
    overlay.classList.remove('gameover-won', 'gameover-lost');
    return;
  }

  overlay.classList.remove('hidden');
  overlay.classList.toggle('gameover-won', state.outcome === 'won');
  overlay.classList.toggle('gameover-lost', state.outcome === 'lost');
  document.getElementById('gameover-text').textContent =
    state.outcome === 'won' ? 'Victory' : 'Defeat';
}

function renderAll() {
  renderHp();
  renderRoom();
  renderDeckCount();
  renderWeaponSlot();
  renderFleeButton();
  renderMessage('');
  renderGameOverBanner();
}

// --- weapon-equip animation -------------------------------------------------

// Keep in sync with the transition duration set on .weapon-flying in style.css.
const WEAPON_FLY_MS = 380;

/** Animates a clone of `cardEl` flying from its current position into the
 * weapon slot, then calls onDone(). The original card is hidden immediately
 * so nothing appears duplicated during the flight. */
function animateWeaponToSlot(cardEl, onDone) {
  const slot = document.getElementById('weapon-slot-card');
  const startRect = cardEl.getBoundingClientRect();
  const endRect = slot.getBoundingClientRect();

  const clone = cardEl.cloneNode(true);
  clone.classList.add('weapon-flying');
  clone.style.left = `${startRect.left}px`;
  clone.style.top = `${startRect.top}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  document.body.appendChild(clone);

  cardEl.style.visibility = 'hidden';

  requestAnimationFrame(() => {
    const dx = endRect.left + (endRect.width - startRect.width) / 2 - startRect.left;
    const dy = endRect.top + (endRect.height - startRect.height) / 2 - startRect.top;
    const scale = endRect.width / startRect.width;
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    clone.style.opacity = '0.4';
  });

  setTimeout(() => {
    clone.remove();
    onDone();
  }, WEAPON_FLY_MS);
}
