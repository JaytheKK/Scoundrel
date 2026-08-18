// ---------------------------------------------------------------------------
// Scoundrel — weapon names.
// Weapon artwork itself lives in images/weapons/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its weapon name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "9 of Diamonds — Mjölnir").
// ---------------------------------------------------------------------------

const WEAPON_NAMES = {
  2: 'Wooden Club (Damaged)',
  3: 'Old Sword (Damaged)',
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
