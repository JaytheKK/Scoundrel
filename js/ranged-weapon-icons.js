// ---------------------------------------------------------------------------
// Scoundrel — ranged weapon names (custom addition, not part of the original
// Scoundrel rules — see "Ranged Weapons" in CLAUDE.md).
//
// Kept as its own file/table rather than folded into WEAPON_NAMES
// (js/weapon-icons.js) because melee and ranged weapon ranks overlap (both
// currently use some of the same 10/15/25/40 values, see the SUITS.RANGED
// comment in js/cards.js) — a single table keyed only by rank couldn't tell
// a "10 melee" (Wooden Club) from a "10 ranged" (Short Bow) apart. Mirrors
// weapon-icons.js's own shape/pattern exactly (per-language tables,
// rangedWeaponNameFor()/rangedWeaponDescriptionFor() read via getLang()) —
// keep the two files structurally identical if either one changes shape.
//
// Artwork lives in images/weapons/RangedWeapons/<rank>.png, assigned
// automatically in makeCard() (js/cards.js) via SUITS.RANGED.
// ---------------------------------------------------------------------------

const RANGED_WEAPON_NAMES = {
  en: {
    10: 'Short Bow',
    15: 'Hunting Bow',
    25: 'War Bow',
    40: 'Long Bow',
  },
  de: {
    10: 'Kurzbogen',
    15: 'Jagdbogen',
    25: 'Kriegsbogen',
    40: 'Langbogen',
  },
};

function rangedWeaponNameFor(rank) {
  const table = RANGED_WEAPON_NAMES[getLang()] || RANGED_WEAPON_NAMES.en;
  return table[rank] || null;
}

// Short flavor blurb shown in the Weapons gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else.
const RANGED_WEAPON_DESCRIPTIONS = {
  en: {
    10: 'A simple hunting bow, light and quick to loose.',
    15: 'A sturdier bow favored by hunters tracking larger game.',
    25: 'A heavy military bow, drawn only by practiced arms.',
    40: 'A masterwork longbow, said to loose an arrow clean through plate.',
  },
  de: {
    10: 'Ein einfacher Jagdbogen, leicht und schnell gespannt.',
    15: 'Ein robusterer Bogen, bevorzugt von Jägern größerer Beute.',
    25: 'Ein schwerer Kriegsbogen, nur von geübten Armen zu spannen.',
    40: 'Ein meisterhafter Langbogen, der angeblich Plattenrüstung glatt durchschlägt.',
  },
};

function rangedWeaponDescriptionFor(rank) {
  const table = RANGED_WEAPON_DESCRIPTIONS[getLang()] || RANGED_WEAPON_DESCRIPTIONS.en;
  return table[rank] || null;
}

/** The full list of ranged weapon ranks that currently exist, sorted
 * ascending — read by renderGallery('weapons') in js/ui.js to build the
 * gallery's "Ranged" section. Derived from RANGED_WEAPON_NAMES.en's keys
 * (same pattern as getMonsterRankPool() in js/monster-icons.js) rather than
 * a separately hand-maintained list, so a new rank added to
 * RANGED_WEAPON_NAMES/RANGED_WEAPON_DESCRIPTIONS above shows up in the
 * gallery automatically — it still needs its own makeCard(SUITS.RANGED, ...)
 * line in js/cards.js's CARD_LIST and its own artwork file, same as adding
 * a melee weapon rank. */
function getRangedWeaponRankPool() {
  return Object.keys(RANGED_WEAPON_NAMES.en)
    .map(Number)
    .sort((a, b) => a - b);
}
