// ---------------------------------------------------------------------------
// Scoundrel — game state, logic, and rendering
// Card definitions live in cards.js (loaded before this file).
// ---------------------------------------------------------------------------

// --- state ---------------------------------------------------------------

let deck = [];
let room = [];

// --- logic -----------------------------------------------------------------

/** Fisher–Yates shuffle, returns a new shuffled array (does not mutate input). */
function shuffle(cards) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function startNewGame() {
  deck = shuffle(getFreshDeck());
  room = deck.splice(0, 4);
  renderRoom();
  renderDeckCount();
}

// --- rendering ---------------------------------------------------------------

/** Builds a DOM element for a card. Uses card.image if set, otherwise falls
 * back to a CSS-drawn placeholder (suit symbol + rank, colored by type). */
function renderCard(card) {
  const el = document.createElement('div');
  el.className = `card card--${card.type}`;
  el.dataset.suit = card.suit;
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
  room.forEach((card) => roomEl.appendChild(renderCard(card)));
}

function renderDeckCount() {
  document.getElementById('deck-count').textContent = `Deck: ${deck.length} cards left`;
}

// --- UI wiring ---------------------------------------------------------------

document.getElementById('new-game-btn').addEventListener('click', startNewGame);
