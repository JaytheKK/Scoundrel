// ---------------------------------------------------------------------------
// Scoundrel — champion active-ability icon artwork + mana cost.
// Each champion has one mana-costed active ability (on top of the passive
// granted at champion-select, see js/champion-icons.js). This file holds the
// icon shown on #ability-btn (js/ui.js's renderAbilityButton(), the circular
// button next to the weapon slot) and how much mana it costs to use
// (ABILITY_MANA_COST below — gainMana()/useAbility() in js/state.js are the
// only other places that number is read from, so change it only here). The
// ability's actual gameplay effect is still a planned follow-up — see
// "Champion Active Abilities" in CLAUDE.md.
//
// Artwork lives at images/abilities/<championId>.png — transparent-
// background black line-art icons cropped from a user-supplied 1x4 sprite
// sheet (images/AbilitiesIcons.jpeg, kept as the source reference: left to
// right, a radiant sunburst for Paladin, a heart+cross for Herbalist, a
// dagger for Rogue, a clenched fist for Berserker — the same order as
// CHAMPIONS in champion-icons.js). Unlike the champion portrait sheet, the
// four icons on this sheet were not drawn at a consistent size (the sunburst
// and fist are visually much bigger than the dagger), so the crop step also
// scaled each icon so its longest side fills the same fraction of a shared
// square canvas before centering it — without that, the button would look
// like it was showing a different icon size per champion. Same contrast-
// stretch alpha as the champion crop (see "Champion artwork" in CLAUDE.md)
// since this is thin line art, not a solid silhouette fill.
const ABILITY_ICONS = {
  paladin: 'images/abilities/paladin.png',
  herbalist: 'images/abilities/herbalist.png',
  rogue: 'images/abilities/rogue.png',
  berserker: 'images/abilities/berserker.png',
};

function abilityIconFor(championId) {
  return ABILITY_ICONS[championId] || null;
}

// How much mana (see state.mana in js/state.js) each champion's active
// ability costs to use — the single source of truth for this number; edit
// values here to rebalance, nothing else needs to change. Mana is gained by
// changing rooms (clearing one or fleeing — gainMana() in js/state.js) and
// resets to 0 on use (useAbility() in js/state.js).
const ABILITY_MANA_COST = {
  paladin: 5,
  herbalist: 4,
  rogue: 3,
  berserker: 4,
};

function abilityManaCostFor(championId) {
  return ABILITY_MANA_COST[championId] || 0;
}

// Plain-language name + description of each champion's active ability
// (mirrors the mechanics implemented in useAbility()/fightMonster()/
// resolveBackstab() in js/state.js — see "Champion Active Abilities" in
// CLAUDE.md). Used by the info popup on #ability-info-btn
// (renderAbilityInfo() in js/ui.js) and by the rules text in #rules
// (index.html) — keep both in sync with this file whenever an ability's
// actual behavior changes, the same "don't let docs drift from the real
// mechanic" rule the rest of the project follows.
const ABILITY_DETAILS = {
  paladin: {
    name: 'Blessing',
    description: 'The next 3 hits that would deal damage are reduced by 3 each.',
  },
  herbalist: {
    name: "Nature's Grace",
    description: 'Instantly heals 3 HP.',
  },
  rogue: {
    name: 'Backstab',
    description: 'Choose a monster afterward to strike it for 6 damage.',
  },
  berserker: {
    name: 'Frenzy',
    description: "For the next 3 weapon fights, the weapon ignores its degrade limit and can strike any monster.",
  },
};

function abilityDetailsFor(championId) {
  return ABILITY_DETAILS[championId] || null;
}
