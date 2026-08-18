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

// Short flavor blurb shown in the Monsters gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else (card
// tooltips only show the name, not this).
const MONSTER_DESCRIPTIONS = {
  2: 'An amorphous ooze, the weakest denizen of the dungeon.',
  3: 'Rattling bones animated by dark magic.',
  4: 'A starving dungeon wolf, fast and vicious.',
  5: 'A skeleton reinforced with rusted plate armor.',
  6: 'A stone guardian that only stirs to attack intruders.',
  7: 'A silent killer that strikes from the shadows.',
  8: 'A living blaze born of dungeon magic.',
  9: 'A horned brute that guards the deeper halls.',
  10: 'A lumbering construct of stone and rune-magic.',
  11: 'An undead sorcerer wielding forbidden magic.',
  12: 'A monstrous spider swollen with venom and eggs.',
  13: 'A scaled terror whose breath scorches the dungeon.',
  14: 'An ancient horror beyond mortal comprehension.',
};

function monsterDescriptionFor(rank) {
  return MONSTER_DESCRIPTIONS[rank] || null;
}
