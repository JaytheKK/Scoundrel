// ---------------------------------------------------------------------------
// Scoundrel — champion roster.
// A champion is chosen once, on the champion-select screen shown whenever a
// new game is started (see openChampionSelect()/startNewGame() in
// js/main.js), and grants one passive ability for that entire run. This
// mirrors the monster-icons.js/weapon-icons.js pattern (a plain id -> data
// lookup table), but champions aren't cards, so there's no makeCard()/rank
// involved here.
//
// Artwork lives at images/champions/<id>.png — transparent-background black
// line-art portraits, cropped from a user-supplied 2x2 sprite sheet
// (images/ChampionsIcons.jpeg, kept as the source reference) the same way
// the monster/weapon sheets were: alpha = 255 - min(R,G,B) per pixel (turns
// the white background transparent, keeps the black linework), then only
// the largest connected shape per quadrant is kept and tightly cropped to
// drop any stray sheet-border fragments (see the "Monster/Weapon artwork"
// sections in CLAUDE.md for the same trick applied there). If a champion
// ever has no artwork (e.g. a newly added one before its art exists), its
// `image` should be left null — buildChampionPortrait()/fillPortrait()
// (js/ui.js) then falls back to a plain-letter placeholder box automatically,
// the same null-image fallback idea fillCardFace() uses for cards.
//
// The actual gameplay logic for each passive lives in js/state.js
// (fightMonster()/drinkPotion()/fleeRoom()), gated on `state.champion`
// matching the id below — this file only holds the display data.
//
// name/description are per-language (see js/i18n.js) but every existing call
// site reads them as a plain `champ.name`/`champ.description` property, not
// through a function — CHAMPIONS below uses a getter for each so that plain
// property access still works everywhere, while staying live-reactive to a
// language switch (the getter re-reads the current language every time it's
// accessed, rather than freezing in whatever language was active when the
// object was built).
// ---------------------------------------------------------------------------

const CHAMPION_BASE = [
  { id: 'paladin', image: 'images/champions/paladin.png' },
  { id: 'herbalist', image: 'images/champions/herbalist.png' },
  { id: 'rogue', image: 'images/champions/rogue.png' },
  { id: 'berserker', image: 'images/champions/berserker.png' },
];

const CHAMPION_NAMES = {
  en: {
    paladin: 'Paladin',
    herbalist: 'Herbalist',
    rogue: 'Rogue',
    berserker: 'Berserker',
  },
  de: {
    paladin: 'Paladin',
    herbalist: 'Kräuter\u00ADkundige',
    rogue: 'Schurke',
    berserker: 'Berserker',
  },
};

const CHAMPION_DESCRIPTIONS = {
  en: {
    paladin: 'For every 5 monsters you defeat, you heal 2 HP',
    herbalist: 'You can drink two potions per room instead of one',
    rogue: 'You are allowed to flee two rooms in a row instead of one',
    berserker: 'Fighting bare-handed, you take 2 less damage from monsters',
  },
  de: {
    paladin: 'Für alle 5 besiegten Monster heilst du 2 LP',
    herbalist: 'Du kannst zwei Tränke pro Raum trinken statt nur einen',
    rogue: 'Du darfst zwei Räume hintereinander fliehen statt nur einen',
    berserker: 'Im bloßhändigen Kampf erleidest du 2 weniger Schaden von Monstern',
  },
};

const CHAMPIONS = CHAMPION_BASE.map((base) => ({
  id: base.id,
  image: base.image,
  get name() {
    const table = CHAMPION_NAMES[getLang()] || CHAMPION_NAMES.en;
    return table[base.id];
  },
  get description() {
    const table = CHAMPION_DESCRIPTIONS[getLang()] || CHAMPION_DESCRIPTIONS.en;
    return table[base.id];
  },
}));

function championById(id) {
  return CHAMPIONS.find((c) => c.id === id) || null;
}
