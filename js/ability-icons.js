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
// Artwork lives at images/abilities/<ChampionId>AbilityTransparent.png —
// full-color, individually user-supplied renders (a runic shield for
// Paladin's Blessing, a heart-shaped tree amulet for Herbalist's Nature's
// Grace, a jeweled dagger for Rogue's Backstab, a flaming fist for
// Berserker's Frenzy), each already background-removed by the user (real
// alpha, no checkerboard baked in — see "Superseded, kept for historical
// reference only" in CLAUDE.md's weapon-artwork notes for what that
// reconstruction step used to look like before assets started arriving
// pre-transparentized like this). Replaces an earlier thin black line-art
// set (images/abilities/<championId>.png, cropped from a shared 1x4 sprite
// sheet) that's no longer referenced anywhere. Each file's own alpha
// bounding box already sits close to its full canvas (checked directly,
// no significant padding like the shield-art case in CLAUDE.md), so no
// extra crop was needed before using them as-is.
const ABILITY_ICONS = {
  paladin: 'images/abilities/PaladinAbilityTransparent.png',
  herbalist: 'images/abilities/HerbalistAbilityTransparent.png',
  rogue: 'images/abilities/RogueAbilityTransparent.png',
  berserker: 'images/abilities/BerserkerAbilityTransparent.png',
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
// (index.html, via js/i18n.js's rulesHtml) — keep all three in sync
// whenever an ability's actual behavior changes, the same "don't let docs
// drift from the real mechanic" rule the rest of the project follows.
// Keyed by language first (see js/i18n.js), like every other name/
// description table — abilityDetailsFor() reads the table for whatever
// getLang() currently returns.
const ABILITY_DETAILS = {
  en: {
    paladin: {
      name: 'Blessing',
      description: 'The next 3 hits that would deal damage are reduced by 10 each.',
    },
    herbalist: {
      name: "Nature's Grace",
      description: 'Instantly heals 25 HP.',
    },
    rogue: {
      name: 'Backstab',
      description: 'Choose a monster to strike it for 30 damage.',
    },
    berserker: {
      name: 'Frenzy',
      description: 'For the next 4 weapon fights, the weapon ignores its degrade limit and can strike any monster.',
    },
  },
  de: {
    paladin: {
      name: 'Segen',
      description: 'Die nächsten 3 Treffer, die Schaden verursachen würden, werden um je 10 verringert.',
    },
    herbalist: {
      name: 'Gnade der Natur',
      description: 'Heilt sofort 25 LP.',
    },
    rogue: {
      name: 'Hinterhalt',
      description: 'Wähle ein Monster, um ihm 30 Schaden zuzufügen.',
    },
    berserker: {
      name: 'Raserei',
      description: 'Für die nächsten 4 Waffenkämpfe ignoriert die Waffe ihre Abnutzungsgrenze und kann jedes Monster treffen.',
    },
  },
};

function abilityDetailsFor(championId) {
  const table = ABILITY_DETAILS[getLang()] || ABILITY_DETAILS.en;
  return table[championId] || null;
}
