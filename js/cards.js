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
//   suit:     'monsters' | 'diamonds' | 'hearts' | 'shields' | 'ranged' |
//             'mage' ('monsters', 'shields', 'ranged', and 'mage' are not
//             real playing-card suits — all four are pseudo-suits that
//             just reuse the same makeCard()/renderCard() plumbing every
//             other card uses; see "Monster Pool", "Shields", and the
//             SUITS.RANGED/SUITS.MAGE comments below.)
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
  // Custom addition, see "Ranged Weapons" in CLAUDE.md. A second, distinct
  // weapon pseudo-suit alongside DIAMONDS (melee) — suitToType() below still
  // maps it to type 'weapon' (so it shares the same weapon equip slot and
  // the same resolveCard() dispatch as a melee weapon, see js/state.js),
  // but its own suit lets fightMonster()/isWeaponUsableOn()/equipWeapon()
  // (js/state.js) and flavorNameFor() (js/ui.js) tell a ranged weapon apart
  // from a melee one, and gives it its own image folder
  // (images/weapons/RangedWeapons/, vs melee's images/weapons/MeleeWeapons/)
  // and its own name/description table (js/ranged-weapon-icons.js) — needed
  // because ranged and melee ranks overlap (both currently use some of the
  // same 10/15/25/40 values), so a single shared WEAPON_NAMES table keyed
  // only by rank could not tell the two apart.
  RANGED: 'ranged',
  // Custom addition, a third weapon pseudo-suit: Mage Staffs. Same damage
  // model as RANGED (its own rank is subtracted directly from the
  // monster's rank instead of reducing incoming damage, with the same 20%
  // chance — MAGE_RETALIATE_CHANCE in js/state.js — of the monster
  // striking back on a shot that doesn't kill) and the same "ignores the
  // weapon degrade rule entirely" behavior (isWeaponUsableOn() in
  // js/state.js) — but instead of a hard 3-shot ammo cap that eventually
  // breaks the weapon, every shot costs 1 mana (MAGE_MANA_COST) from the
  // SAME shared state.mana pool the champion's active ability spends from,
  // and a Mage Staff never breaks. This makes it strictly reusable (no
  // ammo ceiling) but self-limiting through a real opportunity cost
  // instead (every shot delays the champion's own ability), which is also
  // why its ranks are priced noticeably higher than a bow's in deckCost
  // (see the CARD_LIST entries below) despite dealing more raw damage.
  // Own image folder (images/weapons/MageWeapons/) and name/description
  // table (js/mage-weapon-icons.js), same "own suit, own table" pattern as
  // RANGED, since a Mage Staff's ranks (30-60) also overlap some melee
  // ranks (30/45).
  MAGE: 'mage',
};

const SUIT_SYMBOLS = {
  monsters: '☠',
  diamonds: '♦',
  hearts: '♥',
  shields: '⛨',
  ranged: '↗',
  mage: '✶',
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
  // RANGED and MAGE both share type 'weapon' with DIAMONDS on purpose — see
  // the SUITS.RANGED/SUITS.MAGE comments above: it's what lets either flow
  // through the exact same weapon equip slot / resolveCard() dispatch
  // (js/state.js) as a melee weapon.
  if (suit === SUITS.DIAMONDS || suit === SUITS.RANGED || suit === SUITS.MAGE) return 'weapon';
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
    // images/potions/ + js/potion-icons.js, and images/weapons/MeleeWeapons/
    // + js/weapon-icons.js / images/weapons/RangedWeapons/ +
    // js/ranged-weapon-icons.js for the name that goes with each rank.
    // Melee and Ranged weapons need their own subfolder (not a shared
    // images/weapons/<rank>.png) because their ranks overlap (both currently
    // use some of the same 10/15/25/40 values) — a shared path would have
    // one silently overwrite the other's file.
    image:
      suit === SUITS.DIAMONDS
        ? `images/weapons/MeleeWeapons/${rank}.png`
        : suit === SUITS.RANGED
          ? `images/weapons/RangedWeapons/${rank}.png`
          : suit === SUITS.MAGE
            ? `images/weapons/MageWeapons/${rank}.png`
            : `images/${type}s/${rank}.png`,
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
    // Custom addition for the planned weapon Deckbuilder (not wired up to
    // any UI yet — this field is inert data until that system exists, see
    // CLAUDE.md's "Ranged Weapons" section). Defaults to `rank` (a melee
    // weapon's budget cost is just its combat strength, 1:1) — Ranged
    // weapons override this to a lower value via `overrides` below, since a
    // ranged weapon only ever gets RANGED_AMMO_MAX (3) total uses, far fewer
    // than a melee weapon gets before it degrades past usefulness, so its
    // face-value damage number would overstate how much budget it deserves
    // to cost.
    deckCost: rank,
    ...overrides,
  };
}

// Each card gets its own line on purpose — easy to find, tweak, or extend.
// Values are the ×5-rescaled ranks (see "Value rescale" note above) — old
// rank 2-10/3-5 is now 10-50/15-25, in the same steps of 5. Monsters are
// NOT listed here — see "Monster Pool" below for why.
const CARD_LIST = [
  // --- Diamonds (melee weapons, 10-50) ---
  makeCard(SUITS.DIAMONDS, 10),
  makeCard(SUITS.DIAMONDS, 15),
  makeCard(SUITS.DIAMONDS, 20),
  makeCard(SUITS.DIAMONDS, 25),
  makeCard(SUITS.DIAMONDS, 30),
  makeCard(SUITS.DIAMONDS, 35),
  makeCard(SUITS.DIAMONDS, 40),
  makeCard(SUITS.DIAMONDS, 45),
  makeCard(SUITS.DIAMONDS, 50),

  // --- Ranged weapons (custom addition, not part of the original Scoundrel
  // rules — see "Ranged Weapons" in CLAUDE.md): 6 bows, damage
  // 10/15/20/25/30/40. Unlike melee weapons, a ranged weapon's `rank` is
  // subtracted directly from the monster's own rank (see
  // fireRangedWeapon() in js/state.js) rather than reducing incoming
  // damage, and it only ever gets RANGED_AMMO_MAX (3) uses before it
  // breaks — so `deckCost` here is deliberately lower than the raw damage
  // value (roughly half, rounded), reflecting that a ranged weapon
  // delivers far less total value over a full run than a melee weapon of
  // the same face-value rank. Names in js/ranged-weapon-icons.js.
  //
  // Rank 15 was the Hunting Bow's own value until a Recurve Bow (a new
  // 5th bow, filling the gap between the Short and Hunting Bow) was
  // inserted here and took it over, which is why Hunting Bow moved up to
  // 20 and War Bow up to 30 (from 15/25) rather than either staying put —
  // see the "Ranged Weapons" section of CLAUDE.md.
  makeCard(SUITS.RANGED, 10, { deckCost: 5 }),
  makeCard(SUITS.RANGED, 15, { deckCost: 8 }),
  makeCard(SUITS.RANGED, 20, { deckCost: 10 }),
  // Thornbow: a 6th bow, filling the gap between the Hunting Bow (20) and
  // War Bow (30) — unlike the Recurve Bow's insertion above, this one
  // didn't need to shift any other rank, since 25 was already free.
  makeCard(SUITS.RANGED, 25, { deckCost: 13 }),
  makeCard(SUITS.RANGED, 30, { deckCost: 15 }),
  makeCard(SUITS.RANGED, 40, { deckCost: 20 }),

  // --- Mage Staffs (custom addition, not part of the original Scoundrel
  // rules — see the SUITS.MAGE comment above and "Mage Staffs" in
  // CLAUDE.md): 8 staffs/scepters, damage 30-60, noticeably higher than any
  // bow. Same subtract-from-monster-rank damage model and degrade-rule
  // immunity as SUITS.RANGED, but each shot costs 1 mana (MAGE_MANA_COST in
  // js/state.js, drawn from the same pool the champion's active ability
  // spends from) instead of consuming one of a hard 3-shot ammo cap, and
  // the weapon never breaks. deckCost is priced as an ascending fraction of
  // raw damage (0.70x for the weakest staff up to 0.90x for the strongest,
  // rounded) rather than melee's flat 1:1 or ranged's flat ~0.5x — a Mage
  // Staff is strictly more reusable than a bow (no ammo ceiling) and only
  // self-limits through the shared mana pool's real opportunity cost
  // against the champion's own ability, so it's priced closer to melee,
  // rising toward melee's full 1:1 as damage (and therefore power relative
  // to that opportunity cost) climbs. Names in js/mage-weapon-icons.js.
  makeCard(SUITS.MAGE, 30, { deckCost: 21 }), // Apprentice Wand, 30 * 0.700
  makeCard(SUITS.MAGE, 34, { deckCost: 25 }), // Old Mage Staff, 34 * 0.729
  makeCard(SUITS.MAGE, 38, { deckCost: 29 }), // Hex Wand, 38 * 0.757
  makeCard(SUITS.MAGE, 42, { deckCost: 33 }), // Battle Staff, 42 * 0.786
  makeCard(SUITS.MAGE, 45, { deckCost: 37 }), // Crystal Staff, 45 * 0.814
  makeCard(SUITS.MAGE, 49, { deckCost: 41 }), // Dark Scepter, 49 * 0.843
  makeCard(SUITS.MAGE, 55, { deckCost: 48 }), // Arch Mage Scepter, 55 * 0.871
  makeCard(SUITS.MAGE, 60, { deckCost: 54 }), // Arcane Staff, 60 * 0.900

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

/** Returns a fresh copy of this game's full deck: every non-weapon card from
 * CARD_LIST (potions, shields) unconditionally, plus whichever weapon cards
 * are currently selected in the Deckbuilder (js/deckbuilder.js — up to
 * DECKBUILDER_MAX_SLOTS cards, deckCost summing to at most
 * DECKBUILDER_BUDGET, see getSelectedWeaponCardsForDeck() there), plus a
 * freshly-selected 26 monster cards from the monster pool (see
 * selectMonsterCardsForDeck() in js/monster-pool.js). Everything is
 * shallow-copied, so runtime state never mutates CARD_LIST, the monster
 * pool, or the Deckbuilder's own selection array.
 *
 * This is the "planned weapon Deckbuilder" CLAUDE.md's "Ranged Weapons"
 * section used to describe as not yet built (every weapon card was
 * unconditionally included until now) — that plan is now implemented, see
 * js/deckbuilder.js. */
function getFreshDeck() {
  const nonWeaponCards = CARD_LIST.filter((card) => card.type !== 'weapon').map((card) => ({
    ...card,
  }));
  const weaponCards = getSelectedWeaponCardsForDeck().map((card) => ({ ...card }));
  const monsterCards = selectMonsterCardsForDeck(getAllMonsterCards());
  return [...nonWeaponCards, ...weaponCards, ...monsterCards];
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
