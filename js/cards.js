// ---------------------------------------------------------------------------
// Scoundrel — card definitions
//
// Every one of the 44 base cards, plus 3 custom shield cards on top (see
// "Shields" further down — not part of the original Scoundrel deck), is
// listed individually below via makeCard(). This is intentional: it makes
// it easy to later customize, replace, or add special-effect cards one at a
// time (e.g. give a single card a unique `effect` hook) without touching a
// generation loop.
//
// Card shape:
// {
//   id:       unique string, e.g. "diamonds-30", or "monster-45-1"/"-2" for
//             the two instances of one monster rank (see "Monster Pool"
//             below — the instance suffix is what keeps the two unique).
//   suit:     'monsters' | 'diamonds' | 'hearts' | 'shields' (neither
//             'monsters' nor 'shields' is a real playing-card suit — both
//             are pseudo-suits that just reuse the same makeCard()/
//             renderCard() plumbing every other card uses; see "Monster
//             Pool" and "Shields" below.)
//   rank:     current strength value (monsters 10-70, weapons/potions 10-50,
//             shields 15-25 — all a ×5 rescale of the original 2-14/2-10/3-5
//             ranges, see the "Value rescale (×5)" note below). This is the
//             card's CURRENT strength — some card effects can change it at
//             runtime (e.g. the Electric weapon effect lowers a monster's
//             rank). Always use `rank`, never `baseRank`, for anything
//             gameplay-facing (damage math, the number shown on the card,
//             tier/aura).
//   baseRank: the rank the card was created with — never changes. Artwork
//             and flavor-name lookups (monsterNameFor()/potionNameFor()/
//             weaponNameFor()) key off this, not `rank`, so a monster whose
//             rank was lowered by an effect still shows as the same
//             creature (e.g. a weakened Skeleton stays a Skeleton).
//   label:    display text for the rank, e.g. "7", "J", "A"
//   type:     'monster' | 'weapon' | 'potion' | 'shield'
//   name:     human-readable name, e.g. "7 of Clubs"
//   image:    path to card artwork, or null to fall back to the CSS
//             placeholder. Swap this later (e.g. to a pixel-art sprite)
//             without touching any other logic.
//   effect:   null, or a weapon-effect id ('vampiric'/'electric'/'sturdy'/
//             'fragile', see js/weapon-effects.js) — rolled randomly per weapon card
//             at the start of each game (rollWeaponEffects() in
//             js/weapon-effects.js, called from initGame() in state.js).
// }
//
// Value rescale (×5): every gameplay-facing value in the game (HP, monster/
// weapon/potion/shield ranks, flat damage-reduction/heal amounts on
// passives/actives, the safe-start "strong monster" threshold, the card-tier
// breakpoints) was multiplied by 5 in one pass — HP 20→100, monster ranks
// 2-14→10-70, weapon/potion ranks 2-10→10-50, shield ranks 3-5→15-25 — purely
// to open up room between existing values for future monsters (e.g. a new
// monster can now slot in at value 12 or 18, between the old rank-2/rank-3
// equivalents, instead of always having to be appended above rank 14).
// Every relative comparison (damage = monster - weapon, weapon degrade
// ceiling, etc.) scales automatically; only *flat* constants and *absolute*
// thresholds had to be found and multiplied by hand — see CLAUDE.md for the
// full list of what was (and deliberately wasn't — mana costs, ability
// charge/use counts, room counts) touched. Image filenames under
// images/monsters|weapons|potions|shields/ were renamed to match (e.g.
// monsters/2.png → monsters/10.png).
// ---------------------------------------------------------------------------

const SUITS = {
  // Monsters used to be split across two real playing-card suits (clubs and
  // spades) purely so each rank could exist as two separate card instances
  // — that poker-deck framing has been dropped project-wide (monster cards
  // are just "monster cards", see the Monster Pool note below), so both are
  // now one pseudo-suit. Not a real playing-card suit, same idea as SHIELDS
  // below — it only exists so monster cards keep flowing through the same
  // makeCard()/renderCard() plumbing as every other card.
  MONSTERS: 'monsters',
  DIAMONDS: 'diamonds',
  HEARTS: 'hearts',
  // Custom addition on top of the standard 44-card deck — see "Shields"
  // below. Not a real playing-card suit, just reuses the same suit/type
  // plumbing so shield cards flow through makeCard()/renderCard() etc. like
  // every other card.
  SHIELDS: 'shields',
};

const SUIT_SYMBOLS = {
  monsters: '☠',
  diamonds: '♦',
  hearts: '♥',
  shields: '⛨',
};

// Plain numeric labels only — no J/Q/K/A anywhere, per project convention:
// this feeds card.label/card.name (js/state.js) and every tooltip/gallery
// display, so changing it here changes it everywhere at once. Just the rank
// number as a string, no lookup table — this used to be a static object
// keyed 2-14, but that silently broke (label: undefined) the moment ranks
// were rescaled to a ×5 range (10-70 etc.), so it's now rank-value-agnostic.
function rankLabel(rank) {
  return String(rank);
}

function suitToType(suit) {
  if (suit === SUITS.MONSTERS) return 'monster';
  if (suit === SUITS.DIAMONDS) return 'weapon';
  if (suit === SUITS.SHIELDS) return 'shield';
  return 'potion'; // hearts
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Builds one card object. `overrides` lets a specific card get custom
 * properties later (e.g. a name, description, or `effect` function) without
 * changing this helper. */
function makeCard(suit, rank, overrides = {}) {
  const label = rankLabel(rank);
  const type = suitToType(suit);
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
    baseRank: rank,
    label,
    type,
    // Monster cards override this with a plain "Monster <value>" (see
    // getAllMonsterCards() below) — "N of Monsters" reads oddly now that
    // monsters no longer belong to a real playing-card suit, and this is
    // barely user-facing anyway (the flavor name from monsterNameFor()
    // always wins over it, see cardTooltipText()/fightMonster()).
    name: `${label} of ${capitalize(suit)}`,
    // Every card type has its own artwork folder (same image for a given
    // rank regardless of suit) — see images/monsters/ + js/monster-icons.js,
    // images/potions/ + js/potion-icons.js, and images/weapons/ +
    // js/weapon-icons.js for the name that goes with each rank.
    image: `images/${type}s/${rank}.png`,
    // The card border/glow color (see .card--tier-N in style.css), as
    // "R, G, B" for use inside rgba(). Weapons default to white; monsters,
    // potions, and shields get their color from the type-based CSS classes
    // instead (.card--monster / .card--potion / .card--shield) and leave
    // this null. This is what lets a *specific* card carry its own glow
    // later — e.g. a fire weapon could override this to an orange glowRgb
    // via `overrides` once per-card effects exist — without touching the
    // shared tier system.
    glowRgb: type === 'weapon' ? '255, 255, 255' : null,
    effect: null,
    ...overrides,
  };
}

// Each card gets its own line on purpose — easy to find, tweak, or extend.
// Values are the ×5-rescaled ranks (see "Value rescale" note above) — old
// rank 2-10/3-5 is now 10-50/15-25, in the same steps of 5. Monsters are
// NOT listed here — see "Monster Pool" below for why.
const CARD_LIST = [
  // --- Diamonds (weapons, 10-50) ---
  makeCard(SUITS.DIAMONDS, 10),
  makeCard(SUITS.DIAMONDS, 15),
  makeCard(SUITS.DIAMONDS, 20),
  makeCard(SUITS.DIAMONDS, 25),
  makeCard(SUITS.DIAMONDS, 30),
  makeCard(SUITS.DIAMONDS, 35),
  makeCard(SUITS.DIAMONDS, 40),
  makeCard(SUITS.DIAMONDS, 45),
  makeCard(SUITS.DIAMONDS, 50),

  // --- Hearts (potions, 10-50) ---
  makeCard(SUITS.HEARTS, 10),
  makeCard(SUITS.HEARTS, 15),
  makeCard(SUITS.HEARTS, 20),
  makeCard(SUITS.HEARTS, 25),
  makeCard(SUITS.HEARTS, 30),
  makeCard(SUITS.HEARTS, 35),
  makeCard(SUITS.HEARTS, 40),
  makeCard(SUITS.HEARTS, 45),
  makeCard(SUITS.HEARTS, 50),

  // --- Shields (custom addition, not part of the standard 44-card deck —
  // see js/state.js for the equip mechanic and js/shield-icons.js for
  // names/descriptions) ---
  makeCard(SUITS.SHIELDS, 15),
  makeCard(SUITS.SHIELDS, 20),
  makeCard(SUITS.SHIELDS, 25),
];

// ---------------------------------------------------------------------------
// Monster Pool (custom addition, not part of the original Scoundrel rules).
//
// Unlike weapons/potions/shields above, monsters are NOT a fixed hand-written
// list in CARD_LIST — every monster rank in MONSTER_NAMES (js/monster-icons.js,
// getMonsterRankPool() there) gets exactly 2 card instances (ids
// "monster-<rank>-1"/"-2"), and a fresh game draws a random 26 of them (see
// js/monster-pool.js's selectMonsterCardsForDeck(), called from
// getFreshDeck() below). Today that's all 13 ranks × 2 = 26 (no real choice
// yet), but adding a 14th monster rank to MONSTER_NAMES automatically grows
// the pool to 28 possible cards, no other change needed here — the random
// draw (capped at 26, weighted toward a target total-value range) is what
// keeps every game's dungeon composition a little different once there's
// more than 26 monster cards to choose from. See CLAUDE.md's "Monster Pool"
// section for the full design.

/** Builds the full monster card pool: 2 instances of every rank currently in
 * getMonsterRankPool() (js/monster-icons.js). Each instance keeps a distinct
 * id ("monster-<rank>-1"/"-2") so two copies of the same rank can never be
 * confused with each other once dealt into the same room (DOM lookups, the
 * Electric weapon effect's weakenedIds, etc. all key off card.id). Called
 * fresh every time (never cached) since MONSTER_NAMES can grow between calls
 * during development; the resulting objects are always fresh copies, same as
 * CARD_LIST's cards, so nothing here can leak runtime mutations back into a
 * later game. */
function getAllMonsterCards() {
  const cards = [];
  getMonsterRankPool().forEach((rank) => {
    [1, 2].forEach((instance) => {
      cards.push(
        makeCard(SUITS.MONSTERS, rank, {
          id: `monster-${rank}-${instance}`,
          name: `Monster ${rankLabel(rank)}`,
        })
      );
    });
  });
  return cards;
}

/** Returns a fresh copy of this game's full deck (the fixed weapon/potion/
 * shield cards from CARD_LIST, shallow-copied, plus a freshly-selected 26
 * monster cards from the monster pool — see selectMonsterCardsForDeck() in
 * js/monster-pool.js), so runtime state never mutates CARD_LIST or the
 * monster pool. */
function getFreshDeck() {
  const fixedCards = CARD_LIST.map((card) => ({ ...card }));
  const monsterCards = selectMonsterCardsForDeck(getAllMonsterCards());
  return [...fixedCards, ...monsterCards];
}

/** Looks up one card by id (e.g. "diamonds-30", or "monster-45-1") from
 * either CARD_LIST or the full monster pool, returning null if not found.
 * Used by js/tutorial.js to build its fixed, hand-picked scripted deck (see
 * TUTORIAL_DECK_IDS there) — every other caller still goes through
 * getFreshDeck() for a real shuffled game. */
function getCardById(id) {
  return (
    CARD_LIST.find((card) => card.id === id) ||
    getAllMonsterCards().find((card) => card.id === id) ||
    null
  );
}
