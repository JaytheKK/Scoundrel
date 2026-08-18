// ---------------------------------------------------------------------------
// Scoundrel — weapon names.
// Weapon artwork itself lives in images/weapons/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its weapon name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "9 of Diamonds — Mjölnir").
// ---------------------------------------------------------------------------

const WEAPON_NAMES = {
  2: 'Wooden Club',
  3: 'Damaged Sword',
  4: 'Spear',
  5: 'Sword',
  6: 'Battle Axe',
  7: 'Flaming Broadsword',
  8: 'Dark Scythe',
  9: 'Mjölnir',
  10: 'Excalibur',
};

function weaponNameFor(rank) {
  return WEAPON_NAMES[rank] || null;
}

// Short flavor blurb shown in the Weapons gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else (card
// tooltips only show the name, not this).
const WEAPON_DESCRIPTIONS = {
  2: 'A crude, splintering club — barely better than bare fists.',
  3: 'A rusted blade, dulled by age and countless battles.',
  4: 'A long-reaching weapon, simple but effective.',
  5: 'A reliable blade, well balanced for any fight.',
  6: 'A heavy axe that cleaves through armor.',
  7: 'A broadsword wreathed in eternal flame.',
  8: 'A cursed blade that hungers for battle.',
  9: 'A legendary hammer said to summon thunder.',
  10: 'The legendary blade of kings.',
};

function weaponDescriptionFor(rank) {
  return WEAPON_DESCRIPTIONS[rank] || null;
}
