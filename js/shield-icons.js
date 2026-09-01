// ---------------------------------------------------------------------------
// Scoundrel — shield names.
// Shields are a custom addition on top of the standard 44-card deck (see
// js/cards.js) — currently just 3 cards, ranks 15-25 (a ×5 rescale of the
// original 3-5). Artwork lives in
// images/shields/<rank>.png (assigned automatically in makeCard(), see
// js/cards.js) — this file just maps each rank to its shield name, used for
// the card tooltip (see renderCard() in js/ui.js) and the Shields gallery.
// The actual block/durability logic lives in fightMonster() in js/state.js
// (a shield's `rank` doubles as its remaining durability, same pattern as a
// weapon's rank/baseRank split).
//
// Names and descriptions are keyed by language first (see js/i18n.js), so
// shieldNameFor()/shieldDescriptionFor() always read the table for whatever
// getLang() currently returns.
// ---------------------------------------------------------------------------

// Keys are the ×5-rescaled rank values (see "Value rescale" note in
// js/cards.js) — old rank 3-5 is now 15-25, same steps of 5.
const SHIELD_NAMES = {
  en: {
    15: 'Oaken Shield',
    20: 'Round Shield',
    25: 'Lion Crest Shield',
  },
  de: {
    15: 'Eichenschild',
    20: 'Rundschild',
    25: 'Löwenwappenschild',
  },
};

function shieldNameFor(rank) {
  const table = SHIELD_NAMES[getLang()] || SHIELD_NAMES.en;
  return table[rank] || null;
}

// Short flavor blurb shown in the Shields gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else (card
// tooltips only show the name, not this).
const SHIELD_DESCRIPTIONS = {
  en: {
    15: 'A simple wooden shield, carved with an oak leaf.',
    20: 'A sturdy round shield, banded with iron rivets.',
    25: "A knight's heraldic shield, emblazoned with a rampant lion.",
  },
  de: {
    15: 'Ein einfacher Holzschild, mit einem Eichenblatt verziert.',
    20: 'Ein robuster Rundschild, mit eisernen Nieten verstärkt.',
    25: 'Der heraldische Schild eines Ritters, geschmückt mit einem aufgerichteten Löwen.',
  },
};

function shieldDescriptionFor(rank) {
  const table = SHIELD_DESCRIPTIONS[getLang()] || SHIELD_DESCRIPTIONS.en;
  return table[rank] || null;
}

// A shield used to swap to a second, cracked/battered artwork once it had
// taken damage but hadn't broken yet (rank < baseRank) — see
// renderShieldSlot() in js/ui.js. Removed when the shield artwork was
// replaced with new single-image renders (one per rank, no separate
// damaged variant) — a damaged shield now just shows its normal artwork at
// its current (lower) rank number, same as a weakened monster does.
