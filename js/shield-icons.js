// ---------------------------------------------------------------------------
// Scoundrel — shield names.
// Shields are a custom addition on top of the standard 44-card deck (see
// js/cards.js) — currently just 3 cards, ranks 3-5. Artwork lives in
// images/shields/<rank>.png (assigned automatically in makeCard(), see
// js/cards.js) — this file just maps each rank to its shield name, used for
// the card tooltip (see renderCard() in js/ui.js) and the Shields gallery.
// The actual block/durability logic lives in fightMonster() in js/state.js
// (a shield's `rank` doubles as its remaining durability, same pattern as a
// weapon's rank/baseRank split).
// ---------------------------------------------------------------------------

const SHIELD_NAMES = {
  3: 'Oaken Shield',
  4: 'Round Shield',
  5: 'Lion Crest Shield',
};

function shieldNameFor(rank) {
  return SHIELD_NAMES[rank] || null;
}

// Short flavor blurb shown in the Shields gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else (card
// tooltips only show the name, not this).
const SHIELD_DESCRIPTIONS = {
  3: 'A simple wooden shield, carved with an oak leaf.',
  4: 'A sturdy round shield, banded with iron rivets.',
  5: 'A knight\'s heraldic shield, emblazoned with a rampant lion.',
};

function shieldDescriptionFor(rank) {
  return SHIELD_DESCRIPTIONS[rank] || null;
}

// A second artwork per rank, showing the same shield cracked/battered —
// swapped in by renderShieldSlot() (js/ui.js) once an equipped shield has
// taken damage but hasn't broken yet (rank < baseRank, still above 0).
// Keyed off baseRank like the normal artwork, not the current rank — same
// "identity vs. current strength" split used everywhere else (see
// weakenMonster() in js/state.js), just with a second image asset instead
// of only a number change.
const SHIELD_DAMAGED_IMAGES = {
  3: 'images/shields/3-damaged.png',
  4: 'images/shields/4-damaged.png',
  5: 'images/shields/5-damaged.png',
};

function shieldDamagedImageFor(baseRank) {
  return SHIELD_DAMAGED_IMAGES[baseRank] || null;
}
