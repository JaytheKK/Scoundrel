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
// ---------------------------------------------------------------------------

const CHAMPIONS = [
  {
    id: 'paladin',
    name: 'Paladin',
    description: 'Every 5 monsters you defeat, you heal 3 HP.',
    image: 'images/champions/paladin.png',
  },
  {
    id: 'herbalist',
    name: 'Herbalist',
    description: 'You can drink two potions per room instead of just one.',
    image: 'images/champions/herbalist.png',
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'You are allowed to flee two rooms in a row instead of just one.',
    image: 'images/champions/rogue.png',
  },
  {
    id: 'berserker',
    name: 'Berserker',
    description: 'Fighting bare-handed, you take 2 less damage from every monster.',
    image: 'images/champions/berserker.png',
  },
];

function championById(id) {
  return CHAMPIONS.find((c) => c.id === id) || null;
}
