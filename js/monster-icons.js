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

// Keys are the monster gallery's current value ladder (23 types, 10-70).
// This replaced an earlier plain ×5-rescaled 13-type, step-5 ladder (see the
// "Value rescale" note in js/cards.js): 10 new monster types were added and
// ALL 23 values (including the original 13) were re-picked from scratch as
// one continuous curve — 2-wide steps for the first 6 ("trash tier", where
// finer granularity between weak monsters matters more) then a flat 3-wide
// step for the remaining 16, landing exactly on 70 for the Demon Lord, who
// stays the single strongest monster (10 + 6×2 + 16×3 = 70). This is why
// several of the original 13 creatures now sit at a different value than
// before (e.g. Skeleton was 15, is now 14) — every other system that reads a
// monster's value (deck pool selection, safe-start, card tier/glow, weapon
// degrade) reads it live from here, so nothing else needed to change for
// this re-tuning, only this table (and js/i18n.js's tutorial script, which
// referenced a few now-gone monster values by number and was hand-verified
// against the new ones).
const MONSTER_NAMES = {
  en: {
    10: 'Slime',
    12: 'Giant Rat',
    14: 'Skeleton',
    16: 'Cave Bat',
    18: 'Wolf',
    20: 'Highwayman',
    22: 'Armored Skeleton',
    25: 'Orc Grunt',
    28: 'Gargoyle',
    31: 'Cursed Hound',
    34: 'Shadow Assassin',
    37: 'Ghoul',
    40: 'Fire Elemental',
    43: 'Fallen Knight',
    46: 'Minotaur',
    49: 'Wraith',
    52: 'Golem',
    55: 'Ogre',
    58: 'The Lich',
    61: 'Vampire Lord',
    64: 'Brood Mother',
    67: 'Dragon',
    70: 'Demon Lord',
  },
  de: {
    10: 'Schleim',
    12: 'Riesenratte',
    14: 'Skelett',
    16: 'Höhlenfledermaus',
    18: 'Wolf',
    20: 'Wegelagerer',
    22: 'Gepanzertes Skelett',
    25: 'Ork-Grunzer',
    28: 'Gargoyle',
    31: 'Verfluchter Hund',
    34: 'Schattenassassine',
    37: 'Ghul',
    40: 'Feuerelementar',
    43: 'Gefallener Ritter',
    46: 'Minotaurus',
    49: 'Schreckgeist',
    52: 'Golem',
    55: 'Oger',
    58: 'Der Lich',
    61: 'Vampirfürst',
    64: 'Brutmutter',
    67: 'Drache',
    70: 'Dämonenfürst',
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
    10: 'An amorphous ooze, the weakest denizen of the dungeon.',
    12: 'An oversized dungeon rat, more a nuisance than a real threat.',
    14: 'Rattling bones animated by dark magic.',
    16: 'A swarming cave bat, quick and erratic but easily driven off.',
    18: 'A starving dungeon wolf, fast and vicious.',
    20: 'A desperate human bandit who preys on unwary travelers.',
    22: 'A skeleton reinforced with rusted plate armor.',
    25: 'A crude orc foot soldier, more brawn than skill.',
    28: 'A stone guardian that only stirs to attack intruders.',
    31: 'A spectral hound bound to the dungeon by an ancient curse, forever hunting.',
    34: 'A silent killer that strikes from the shadows.',
    37: "A ravenous undead scavenger that feeds on the dungeon's dead.",
    40: 'A living blaze born of dungeon magic.',
    43: 'A once-noble knight, now an undead husk bound to endless service.',
    46: 'A horned brute that guards the deeper halls.',
    49: 'A vengeful spirit that chills the air and drains the will to fight.',
    52: 'A lumbering construct of stone and rune-magic.',
    55: 'A hulking brute that crushes anything foolish enough to stand in its way.',
    58: 'An undead sorcerer wielding forbidden magic.',
    61: 'A noble of the undead court, commanding dark magic and an unnatural thirst.',
    64: 'A monstrous spider swollen with venom and eggs.',
    67: 'A scaled terror whose breath scorches the dungeon.',
    70: 'A fallen ruler of the abyss, wreathed in hellfire.',
  },
  de: {
    10: 'Ein amorpher Schleimklumpen, der schwächste Bewohner des Dungeons.',
    12: 'Eine überdimensionale Dungeonratte, eher ein Ärgernis als eine echte Bedrohung.',
    14: 'Klappernde Knochen, die durch dunkle Magie zum Leben erweckt wurden.',
    16: 'Eine schwärmende Höhlenfledermaus, schnell und unberechenbar, aber leicht zu vertreiben.',
    18: 'Ein ausgehungerter Dungeonwolf, schnell und bösartig.',
    20: 'Ein verzweifelter menschlicher Bandit, der ahnungslosen Reisenden auflauert.',
    22: 'Ein Skelett, verstärkt mit rostiger Plattenrüstung.',
    25: 'Ein grober Ork-Fußsoldat, mehr Kraft als Können.',
    28: 'Ein steinerner Wächter, der nur erwacht, um Eindringlinge anzugreifen.',
    31: 'Ein geisterhafter Hund, durch einen uralten Fluch an den Dungeon gebunden, für immer auf der Jagd.',
    34: 'Ein stiller Mörder, der aus den Schatten zuschlägt.',
    37: 'Ein gefräßiger untoter Aasfresser, der sich von den Toten des Dungeons ernährt.',
    40: 'Eine lebende Flamme, geboren aus der Magie des Dungeons.',
    43: 'Ein einst ehrenhafter Ritter, nun eine untote Hülle, gebunden an endlosen Dienst.',
    46: 'Ein gehörnter Schläger, der die tieferen Hallen bewacht.',
    49: 'Ein rachsüchtiger Geist, der die Luft erkalten lässt und den Kampfeswillen raubt.',
    52: 'Ein schwerfälliger Koloss aus Stein und Runenmagie.',
    55: 'Ein bulliger Riese, der alles zermalmt, was so dumm ist, sich ihm in den Weg zu stellen.',
    58: 'Ein untoter Zauberer, der verbotene Magie beherrscht.',
    61: 'Ein Adeliger des untoten Hofes, der dunkle Magie und einen unnatürlichen Durst befehligt.',
    64: 'Eine monströse Spinne, geschwollen von Gift und Eiern.',
    67: 'Ein schuppiger Schrecken, dessen Atem das Dungeon versengt.',
    70: 'Ein gestürzter Herrscher des Abgrunds, gehüllt in Höllenfeuer.',
  },
};

function monsterDescriptionFor(rank) {
  const table = MONSTER_DESCRIPTIONS[getLang()] || MONSTER_DESCRIPTIONS.en;
  return table[rank] || null;
}

/** The full list of monster ranks that currently exist, sorted ascending —
 * the single source of truth for "how many/which monster types are there",
 * read by js/cards.js's getAllMonsterCards() (the deck's monster pool) and
 * by renderGallery('monsters') in js/ui.js (the start-screen Monsters
 * gallery). Derived straight from MONSTER_NAMES.en's keys rather than a
 * separately hand-maintained list, so adding a new rank to MONSTER_NAMES/
 * MONSTER_DESCRIPTIONS above is the only step needed to make a new monster
 * show up everywhere (deck pool, gallery, preload) — see "Monster Pool" in
 * js/cards.js. Reads MONSTER_NAMES.en specifically (not getLang()'s current
 * table) so the pool's size/order can never differ by language — both
 * language tables are expected to define the exact same rank keys. */
function getMonsterRankPool() {
  return Object.keys(MONSTER_NAMES.en)
    .map(Number)
    .sort((a, b) => a - b);
}
