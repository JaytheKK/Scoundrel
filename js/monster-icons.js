// ---------------------------------------------------------------------------
// Scoundrel — monster bestiary names.
// Monster artwork itself lives in images/monsters/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its creature name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "7 of Clubs — Shadow Assassin").
// ---------------------------------------------------------------------------

const MONSTER_NAMES = {
  2: 'Slime',
  3: 'Skeleton',
  4: 'Wolf',
  5: 'Armored Skeleton',
  6: 'Gargoyle',
  7: 'Shadow Assassin',
  8: 'Fire Elemental',
  9: 'Minotaur',
  10: 'Golem',
  11: 'The Lich',
  12: 'Brood Mother',
  13: 'Dragon',
  14: 'Cthulhu',
};

function monsterNameFor(rank) {
  return MONSTER_NAMES[rank] || null;
}
