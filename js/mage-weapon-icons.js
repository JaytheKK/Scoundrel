// ---------------------------------------------------------------------------
// Scoundrel — Mage Staff names (custom addition, not part of the original
// Scoundrel rules — see the SUITS.MAGE comment in js/cards.js and "Mage
// Staffs" in CLAUDE.md).
//
// Kept as its own file/table, mirroring js/ranged-weapon-icons.js's own
// shape/pattern exactly (per-language tables, mageWeaponNameFor()/
// mageWeaponDescriptionFor() read via getLang()) — same reason as ranged
// weapons: a Mage Staff's ranks (30-60) overlap some melee ranks (30/45), so
// a single table keyed only by rank couldn't tell a "30 melee" (Battle Axe)
// from a "30 mage" (Apprentice Wand) apart. Keep the two files structurally
// identical if either one changes shape.
//
// Artwork lives in images/weapons/MageWeapons/<rank>.png, assigned
// automatically in makeCard() (js/cards.js) via SUITS.MAGE.
// ---------------------------------------------------------------------------

const MAGE_WEAPON_NAMES = {
  en: {
    30: 'Apprentice Wand',
    34: 'Old Mage Staff',
    38: 'Hex Wand',
    42: 'Battle Staff',
    45: 'Crystal Staff',
    49: 'Dark Scepter',
    55: 'Arch Mage Scepter',
    60: 'Arcane Staff',
  },
  de: {
    30: 'Lehrlingsstab',
    34: 'Alter Magierstab',
    38: 'Hexenstab',
    42: 'Kampfstab',
    45: 'Kristallstab',
    49: 'Dunkles Zepter',
    55: 'Erzmagier-Zepter',
    60: 'Arkanstab',
  },
};

function mageWeaponNameFor(rank) {
  const table = MAGE_WEAPON_NAMES[getLang()] || MAGE_WEAPON_NAMES.en;
  return table[rank] || null;
}

// Short flavor blurb shown on a Mage Staff card's flipped-over back face
// (see "Card flip (description back face)" in CLAUDE.md) — not used
// anywhere else.
const MAGE_WEAPON_DESCRIPTIONS = {
  en: {
    30: "A plain birch wand tipped with a rough-cut crystal, an apprentice's first taste of real spellcraft.",
    34: 'A gnarled hexwood rod bound in tarnished copper, favored by mages who have seen a few real fights.',
    38: 'A dark rod carved with warding runes, its amethyst crystal humming with a faint curse.',
    42: 'A long battle-worn staff, carried by war mages who fight on the front line, not behind it.',
    45: 'A slender rod crowned with a faceted sapphire, channeling power with practiced precision.',
    49: 'A blackened scepter set with a multifaceted ruby, favored by mages who deal in darker magic.',
    55: 'An ornate gold-banded scepter, carried only by those who have earned the title of Arch Mage.',
    60: "A towering staff of pale ivory and gold, crowned with a brilliant diamond, a true archmage's masterwork.",
  },
  de: {
    30: 'Ein schlichter Birkenstab mit grob geschliffenem Kristall, der erste Griff eines Lehrlings zur echten Magie.',
    34: 'Ein knorriger Hexenholzstab mit angelaufenem Kupferband, geschätzt von Magiern mit ein paar echten Kämpfen im Rücken.',
    38: 'Ein dunkler Stab mit eingeschnitzten Schutzrunen, dessen Amethyst leise von einem Fluch summt.',
    42: 'Ein langer, kampferprobter Stab, geführt von Kriegsmagiern, die an vorderster Front kämpfen.',
    45: 'Ein schlanker Stab mit facettiertem Saphir, der Macht mit geübter Präzision kanalisiert.',
    49: 'Ein geschwärztes Zepter mit vielfach geschliffenem Rubin, bevorzugt von Magiern dunklerer Kunst.',
    55: 'Ein kunstvolles, goldberänderter Zepter, das nur trägt, wer sich den Titel Erzmagier verdient hat.',
    60: 'Ein hoch aufragender Stab aus blassem Elfenbein und Gold, gekrönt von einem strahlenden Diamanten, das Meisterwerk eines wahren Erzmagiers.',
  },
};

function mageWeaponDescriptionFor(rank) {
  const table = MAGE_WEAPON_DESCRIPTIONS[getLang()] || MAGE_WEAPON_DESCRIPTIONS.en;
  return table[rank] || null;
}

/** The full list of Mage Staff ranks that currently exist, sorted ascending
 * — read by renderDeckbuilder() (js/ui.js) to build the Deckbuilder pool's
 * "Mage Staffs" section. Derived from MAGE_WEAPON_NAMES.en's keys (same
 * pattern as getRangedWeaponRankPool() in js/ranged-weapon-icons.js) rather
 * than a separately hand-maintained list, so a new rank added to
 * MAGE_WEAPON_NAMES/MAGE_WEAPON_DESCRIPTIONS above shows up automatically —
 * it still needs its own makeCard(SUITS.MAGE, ...) line in js/cards.js's
 * CARD_LIST and its own artwork file. */
function getMageWeaponRankPool() {
  return Object.keys(MAGE_WEAPON_NAMES.en)
    .map(Number)
    .sort((a, b) => a - b);
}
