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
  { id: 'swordmaster', image: 'images/champions/swordmaster.png' },
];

const CHAMPION_NAMES = {
  en: {
    paladin: 'Paladin',
    herbalist: 'Herbalist',
    rogue: 'Rogue',
    berserker: 'Berserker',
    swordmaster: 'Sword Master',
  },
  de: {
    paladin: 'Paladin',
    herbalist: 'Kräuter\u00ADkundige',
    rogue: 'Schurke',
    berserker: 'Berserker',
    swordmaster: 'Schwert­meister',
  },
};

// Short flavor blurb shown in the Champions gallery's detail popup, above
// the passive/active ability text (see renderGalleryDetail() in js/ui.js) —
// same idea and tone as MONSTER_DESCRIPTIONS/WEAPON_DESCRIPTIONS (a plain
// lore sentence, no mechanics), kept as its own field since champ.description
// below is already used everywhere else (champion-select tile, the
// #champion-badge tooltip, this same detail popup) as the passive ability's
// text, not a flavor blurb.
const CHAMPION_FLAVOR = {
  en: {
    paladin: 'A devout knight who channels holy faith into both blade and shield.',
    herbalist: "A wandering healer, well versed in poultices and the dungeon's hidden remedies.",
    rogue: "A quick-fingered thief who slips past danger and strikes when it's least expected.",
    berserker: 'A battle-hardened warrior who shrugs off pain and hits hardest with bare fists.',
    swordmaster: 'A disciplined duelist who has spent a lifetime perfecting the care and use of a blade.',
  },
  de: {
    paladin: 'Ein frommer Ritter, der heiligen Glauben in Klinge und Schild lenkt.',
    herbalist: 'Eine Kräuterkundige, bewandert in Umschlägen und den verborgenen Heilmitteln des Dungeons.',
    rogue: 'Ein flinkfingriger Dieb, der der Gefahr ausweicht und zuschlägt, wenn man es am wenigsten erwartet.',
    berserker: 'Ein kampferprobter Krieger, der Schmerz ignoriert und am härtesten mit bloßen Fäusten zuschlägt.',
    swordmaster: 'Ein disziplinierter Duellant, der sein Leben der Pflege und dem Einsatz der Klinge gewidmet hat.',
  },
};

const CHAMPION_DESCRIPTIONS = {
  en: {
    paladin: 'For every 5 monsters you defeat, you heal 10 HP',
    herbalist: 'You can drink two potions per room instead of one',
    rogue: 'You are allowed to flee two rooms in a row instead of one',
    berserker: 'Fighting bare-handed, you take 10 less damage from monsters',
    swordmaster: "Your weapon's degrade limit can never drop by more than 15 per fight",
  },
  de: {
    paladin: 'Für alle 5 besiegten Monster heilst du 10 LP',
    herbalist: 'Du kannst zwei Tränke pro Raum trinken statt nur einen',
    rogue: 'Du darfst zwei Räume hintereinander fliehen statt nur einen',
    berserker: 'Im bloßhändigen Kampf erleidest du 10 weniger Schaden von Monstern',
    swordmaster: 'Die Abnutzungsgrenze deiner Waffe kann pro Kampf nie um mehr als 15 sinken',
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
  get flavor() {
    const table = CHAMPION_FLAVOR[getLang()] || CHAMPION_FLAVOR.en;
    return table[base.id];
  },
}));

function championById(id) {
  return CHAMPIONS.find((c) => c.id === id) || null;
}
