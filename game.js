// ---------------------------------------------------------------------------
// Scoundrel — game logic
// Step 1: build and shuffle the 44-card dungeon deck.
// UI wiring is kept separate (bottom of file) so the logic above can be
// reasoned about / tested on its own.
// ---------------------------------------------------------------------------

const SUITS = {
  CLUBS: 'clubs',
  SPADES: 'spades',
  DIAMONDS: 'diamonds',
  HEARTS: 'hearts',
};

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // J=11, Q=12, K=13, A=14

const RANK_LABELS = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

function rankLabel(rank) {
  return RANK_LABELS[rank] || String(rank);
}

function cardType(suit) {
  if (suit === SUITS.CLUBS || suit === SUITS.SPADES) return 'monster';
  if (suit === SUITS.DIAMONDS) return 'weapon';
  return 'potion'; // hearts
}

/**
 * Builds the 44-card Scoundrel deck:
 * - Clubs & Spades: all ranks 2-14 (monsters)
 * - Diamonds: ranks 2-10 only (weapons)
 * - Hearts: ranks 2-10 only (potions)
 * (Red face cards J/Q/K and both red Aces are excluded, per the rules.)
 */
function buildDeck() {
  const deck = [];

  for (const suit of [SUITS.CLUBS, SUITS.SPADES]) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, type: cardType(suit) });
    }
  }

  for (const suit of [SUITS.DIAMONDS, SUITS.HEARTS]) {
    for (const rank of RANKS.filter((r) => r <= 10)) {
      deck.push({ suit, rank, type: cardType(suit) });
    }
  }

  return deck;
}

/** Fisher–Yates shuffle, returns a new shuffled array (does not mutate input). */
function shuffle(deck) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------------------------------------------------------------------
// UI wiring (temporary debug hook for this step)
// ---------------------------------------------------------------------------

document.getElementById('new-game-btn').addEventListener('click', () => {
  const deck = shuffle(buildDeck());
  const output = document.getElementById('debug-output');
  output.textContent = `Deck built: ${deck.length} cards. Top card: ` +
    `${rankLabel(deck[0].rank)} of ${deck[0].suit} (${deck[0].type}).`;
  console.log('Full deck:', deck);
});
