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
// the badge's tooltip and #weapon-status, so a single letter is enough. The
// letters themselves stay fixed (V/E/S/F) regardless of language — they're a
// compact internal code, not required to match the translated name's first
// letter, the same way a game icon doesn't need to spell out its own label.
//
// name/description are per-language (see js/i18n.js), keyed in
// WEAPON_EFFECT_TEXT below. Every existing call site reads WEAPON_EFFECTS[id]
// .name/.description as a plain property (fillCardFace()/renderWeaponSlot()
// in js/ui.js), not through a function, so each entry below uses a getter —
// same reasoning and pattern as CHAMPIONS in js/champion-icons.js — to stay
// live-reactive to a language switch without touching those call sites.
const WEAPON_EFFECT_TEXT = {
  en: {
    vampiric: {
      name: 'Vampiric',
      description: 'Heals 1 HP whenever this weapon defeats a monster.',
    },
    electric: {
      name: 'Electric',
      description: 'Every other revealed monster loses 1 strength whenever this weapon is used in a fight.',
    },
    sturdy: {
      name: 'Sturdy',
      description: "This weapon's usable strength can never drop by more than 2 per fight.",
    },
    fragile: {
      name: 'Fragile',
      description: `Breaks after ${FRAGILE_MAX_USES} uses, no matter which monster it's used on.`,
    },
  },
  de: {
    vampiric: {
      name: 'Vampirisch',
      description: 'Heilt 1 LP, wenn diese Waffe ein Monster besiegt.',
    },
    electric: {
      name: 'Elektrisch',
      description: 'Jedes andere aufgedeckte Monster verliert 1 Stärke, wenn diese Waffe in einem Kampf eingesetzt wird.',
    },
    sturdy: {
      name: 'Robust',
      description: 'Die einsetzbare Stärke dieser Waffe kann pro Kampf nie um mehr als 2 sinken.',
    },
    fragile: {
      name: 'Zerbrechlich',
      description: `Zerbricht nach ${FRAGILE_MAX_USES} Anwendungen, egal gegen welches Monster.`,
    },
  },
};

function weaponEffectText(id, field) {
  const table = WEAPON_EFFECT_TEXT[getLang()] || WEAPON_EFFECT_TEXT.en;
  return table[id][field];
}

const WEAPON_EFFECTS = {
  vampiric: {
    icon: 'V',
    get name() { return weaponEffectText('vampiric', 'name'); },
    get description() { return weaponEffectText('vampiric', 'description'); },
  },
  electric: {
    icon: 'E',
    get name() { return weaponEffectText('electric', 'name'); },
    get description() { return weaponEffectText('electric', 'description'); },
  },
  sturdy: {
    icon: 'S',
    get name() { return weaponEffectText('sturdy', 'name'); },
    get description() { return weaponEffectText('sturdy', 'description'); },
  },
  fragile: {
    icon: 'F',
    get name() { return weaponEffectText('fragile', 'name'); },
    get description() { return weaponEffectText('fragile', 'description'); },
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
