// ---------------------------------------------------------------------------
// Scoundrel — card definitions
//
// Every one of the 44 base cards is listed individually below via makeCard().
// This is intentional: it makes it easy to later customize, replace, or add
// special-effect cards one at a time (e.g. give a single card a unique
// `effect` hook) without touching a generation loop.
//
// Card shape:
// {
//   id:       unique string, e.g. "clubs-7"
//   suit:     'clubs' | 'spades' | 'diamonds' | 'hearts'
//   rank:     2-14 (11=J, 12=Q, 13=K, 14=A). This is the card's CURRENT
//             strength — some card effects can change it at runtime (e.g.
//             the Electric weapon effect lowers a monster's rank). Always
//             use `rank`, never `baseRank`, for anything gameplay-facing
//             (damage math, the number shown on the card, tier/aura).
//   baseRank: the rank the card was created with — never changes. Artwork
//             and flavor-name lookups (monsterNameFor()/potionNameFor()/
//             weaponNameFor()) key off this, not `rank`, so a monster whose
//             rank was lowered by an effect still shows as the same
//             creature (e.g. a weakened Skeleton stays a Skeleton).
//   label:    display text for the rank, e.g. "7", "J", "A"
//   type:     'monster' | 'weapon' | 'potion'
//   name:     human-readable name, e.g. "7 of Clubs"
//   image:    path to card artwork, or null to fall back to the CSS
//             placeholder. Swap this later (e.g. to a pixel-art sprite)
//             without touching any other logic.
//   effect:   null, or a weapon-effect id ('vampiric'/'electric'/'sturdy',
//             see js/weapon-effects.js) — rolled randomly per weapon card
//             at the start of each game (rollWeaponEffects() in
//             js/weapon-effects.js, called from initGame() in state.js).
// }
// ---------------------------------------------------------------------------

const SUITS = {
  CLUBS: 'clubs',
  SPADES: 'spades',
  DIAMONDS: 'diamonds',
  HEARTS: 'hearts',
};

const SUIT_SYMBOLS = {
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
  hearts: '♥',
};

// Plain numeric labels only (2-14) — no J/Q/K/A anywhere, per project
// convention: this feeds card.label/card.name (js/state.js) and every
// tooltip/gallery display, so changing it here changes it everywhere at once.
const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
  7: '7', 8: '8', 9: '9', 10: '10',
  11: '11', 12: '12', 13: '13', 14: '14',
};

function suitToType(suit) {
  if (suit === SUITS.CLUBS || suit === SUITS.SPADES) return 'monster';
  if (suit === SUITS.DIAMONDS) return 'weapon';
  return 'potion'; // hearts
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Builds one card object. `overrides` lets a specific card get custom
 * properties later (e.g. a name, description, or `effect` function) without
 * changing this helper. */
function makeCard(suit, rank, overrides = {}) {
  const label = RANK_LABELS[rank];
  const type = suitToType(suit);
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
    baseRank: rank,
    label,
    type,
    name: `${label} of ${capitalize(suit)}`,
    // Every card type has its own artwork folder (same image for a given
    // rank regardless of suit) — see images/monsters/ + js/monster-icons.js,
    // images/potions/ + js/potion-icons.js, and images/weapons/ +
    // js/weapon-icons.js for the name that goes with each rank.
    image: `images/${type}s/${rank}.png`,
    // The card border/glow color (see .card--tier-N in style.css), as
    // "R, G, B" for use inside rgba(). Weapons default to white; monsters
    // and potions get their color from the type-based CSS classes instead
    // (.card--monster / .card--potion) and leave this null. This is what
    // lets a *specific* card carry its own glow later — e.g. a fire weapon
    // could override this to an orange glowRgb via `overrides` once
    // per-card effects exist — without touching the shared tier system.
    glowRgb: type === 'weapon' ? '255, 255, 255' : null,
    effect: null,
    ...overrides,
  };
}

// Each card gets its own line on purpose — easy to find, tweak, or extend.
const CARD_LIST = [
  // --- Clubs (monsters, 2-14) ---
  makeCard(SUITS.CLUBS, 2),
  makeCard(SUITS.CLUBS, 3),
  makeCard(SUITS.CLUBS, 4),
  makeCard(SUITS.CLUBS, 5),
  makeCard(SUITS.CLUBS, 6),
  makeCard(SUITS.CLUBS, 7),
  makeCard(SUITS.CLUBS, 8),
  makeCard(SUITS.CLUBS, 9),
  makeCard(SUITS.CLUBS, 10),
  makeCard(SUITS.CLUBS, 11),
  makeCard(SUITS.CLUBS, 12),
  makeCard(SUITS.CLUBS, 13),
  makeCard(SUITS.CLUBS, 14),

  // --- Spades (monsters, 2-14) ---
  makeCard(SUITS.SPADES, 2),
  makeCard(SUITS.SPADES, 3),
  makeCard(SUITS.SPADES, 4),
  makeCard(SUITS.SPADES, 5),
  makeCard(SUITS.SPADES, 6),
  makeCard(SUITS.SPADES, 7),
  makeCard(SUITS.SPADES, 8),
  makeCard(SUITS.SPADES, 9),
  makeCard(SUITS.SPADES, 10),
  makeCard(SUITS.SPADES, 11),
  makeCard(SUITS.SPADES, 12),
  makeCard(SUITS.SPADES, 13),
  makeCard(SUITS.SPADES, 14),

  // --- Diamonds (weapons, 2-10) ---
  makeCard(SUITS.DIAMONDS, 2),
  makeCard(SUITS.DIAMONDS, 3),
  makeCard(SUITS.DIAMONDS, 4),
  makeCard(SUITS.DIAMONDS, 5),
  makeCard(SUITS.DIAMONDS, 6),
  makeCard(SUITS.DIAMONDS, 7),
  makeCard(SUITS.DIAMONDS, 8),
  makeCard(SUITS.DIAMONDS, 9),
  makeCard(SUITS.DIAMONDS, 10),

  // --- Hearts (potions, 2-10) ---
  makeCard(SUITS.HEARTS, 2),
  makeCard(SUITS.HEARTS, 3),
  makeCard(SUITS.HEARTS, 4),
  makeCard(SUITS.HEARTS, 5),
  makeCard(SUITS.HEARTS, 6),
  makeCard(SUITS.HEARTS, 7),
  makeCard(SUITS.HEARTS, 8),
  makeCard(SUITS.HEARTS, 9),
  makeCard(SUITS.HEARTS, 10),
];

/** Returns a fresh copy of the 44-card deck (shallow-copied cards), so
 * runtime state never mutates the master CARD_LIST. */
function getFreshDeck() {
  return CARD_LIST.map((card) => ({ ...card }));
}
