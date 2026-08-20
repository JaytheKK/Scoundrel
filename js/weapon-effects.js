// ---------------------------------------------------------------------------
// Scoundrel — weapon effects.
// Unlike the per-rank artwork lookups (monster/potion/weapon-icons.js),
// these effects aren't tied to a specific card's identity — any of the 9
// weapon cards can randomly get one at the start of a game. The actual
// gameplay logic for each effect lives in fightMonster() in js/state.js
// (it needs access to `state`); this file only holds the effect metadata
// (name/icon/description, for the card badge and tooltip) and the roll
// that assigns them.
// ---------------------------------------------------------------------------

// How many fights a Fragile weapon survives before it breaks, regardless of
// which monster it's used on. Tracked per-equip via
// state.weaponFragileUsesRemaining (js/state.js), reset to this value every
// time a Fragile weapon is equipped (equipWeapon()) and counted down by
// fightMonster() each time it's actually used. Declared before WEAPON_EFFECTS
// below so its own description can read from it, keeping the number in one
// place if this is ever rebalanced.
const FRAGILE_MAX_USES = 2;

// Badge icons are plain letters, not emoji — an emoji shield (🛡) turned out
// not to render on every system/font, while a plain letter always does and
// stays consistent with the rest of the game's simple, text/symbol-based UI
// (e.g. the ⚔ empty-weapon-slot icon). The full name is always available via
// the badge's tooltip and #weapon-status, so a single letter is enough.
const WEAPON_EFFECTS = {
  vampiric: {
    name: 'Vampiric',
    icon: 'V',
    description: 'Heals 1 HP whenever this weapon defeats a monster.',
  },
  electric: {
    name: 'Electric',
    icon: 'E',
    description: 'Every other revealed monster loses 1 strength whenever this weapon is used in a fight.',
  },
  sturdy: {
    name: 'Sturdy',
    icon: 'S',
    description: "This weapon's usable strength can never drop by more than 2 per fight.",
  },
  fragile: {
    name: 'Fragile',
    icon: 'F',
    description: `Breaks after ${FRAGILE_MAX_USES} uses, no matter which monster it's used on.`,
  },
};

const WEAPON_EFFECT_IDS = Object.keys(WEAPON_EFFECTS);
const WEAPON_EFFECT_CHANCE = 0.25;

/** Gives each weapon card in `deck` a 25% chance to get a random effect
 * (vampiric/electric/sturdy/fragile). Called once per new game (see initGame() in
 * js/state.js) so which weapons — if any — have an effect is re-rolled
 * every game, not fixed to specific cards. */
function rollWeaponEffects(deck) {
  deck.forEach((card) => {
    if (card.type === 'weapon' && Math.random() < WEAPON_EFFECT_CHANCE) {
      const id = WEAPON_EFFECT_IDS[Math.floor(Math.random() * WEAPON_EFFECT_IDS.length)];
      card.effect = id;
    }
  });
}
