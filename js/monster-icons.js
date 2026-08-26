// ---------------------------------------------------------------------------
// Scoundrel — monster bestiary names.
// Monster artwork itself lives in images/monsters/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its creature name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "Shadow Assassin"). The tooltip shows only the flavor
// name, never the underlying poker-card name.
//
// Both names and descriptions are keyed by language first (see js/i18n.js),
// so monsterNameFor()/monsterDescriptionFor() always read the table for
// whatever getLang() currently returns — a language switch shows the new
// text the next time either function is called, no page reload needed.
// ---------------------------------------------------------------------------

const MONSTER_NAMES = {
  en: {
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
    14: 'Demon Lord',
  },
  de: {
    2: 'Schleim',
    3: 'Skelett',
    4: 'Wolf',
    5: 'Gepanzertes Skelett',
    6: 'Gargoyle',
    7: 'Schattenassassine',
    8: 'Feuerelementar',
    9: 'Minotaurus',
    10: 'Golem',
    11: 'Der Lich',
    12: 'Brutmutter',
    13: 'Drache',
    14: 'Dämonenfürst',
  },
};

function monsterNameFor(rank) {
  const table = MONSTER_NAMES[getLang()] || MONSTER_NAMES.en;
  return table[rank] || null;
}

// Short flavor blurb shown in the Monsters gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else (card
// tooltips only show the name, not this).
const MONSTER_DESCRIPTIONS = {
  en: {
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
    14: 'A fallen ruler of the abyss, wreathed in hellfire.',
  },
  de: {
    2: 'Ein amorpher Schleimklumpen, der schwächste Bewohner des Dungeons.',
    3: 'Klappernde Knochen, die durch dunkle Magie zum Leben erweckt wurden.',
    4: 'Ein ausgehungerter Dungeonwolf, schnell und bösartig.',
    5: 'Ein Skelett, verstärkt mit rostiger Plattenrüstung.',
    6: 'Ein steinerner Wächter, der nur erwacht, um Eindringlinge anzugreifen.',
    7: 'Ein stiller Mörder, der aus den Schatten zuschlägt.',
    8: 'Eine lebende Flamme, geboren aus der Magie des Dungeons.',
    9: 'Ein gehörnter Schläger, der die tieferen Hallen bewacht.',
    10: 'Ein schwerfälliger Koloss aus Stein und Runenmagie.',
    11: 'Ein untoter Zauberer, der verbotene Magie beherrscht.',
    12: 'Eine monströse Spinne, geschwollen von Gift und Eiern.',
    13: 'Ein schuppiger Schrecken, dessen Atem das Dungeon versengt.',
    14: 'Ein gestürzter Herrscher des Abgrunds, gehüllt in Höllenfeuer.',
  },
};

function monsterDescriptionFor(rank) {
  const table = MONSTER_DESCRIPTIONS[getLang()] || MONSTER_DESCRIPTIONS.en;
  return table[rank] || null;
}
