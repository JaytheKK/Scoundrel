// ---------------------------------------------------------------------------
// Scoundrel — potion names.
// Potion artwork itself lives in images/potions/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its potion name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "8 of Hearts — Imperial Potion").
// ---------------------------------------------------------------------------

const POTION_NAMES = {
  2: 'Small Potion',
  3: 'Medium Potion',
  4: 'Large Potion',
  5: 'Strong Potion',
  6: 'Very Strong Potion',
  7: 'Royal Potion',
  8: 'Imperial Potion',
  9: 'Legendary Potion',
  10: 'Ultimate Potion',
};

function potionNameFor(rank) {
  return POTION_NAMES[rank] || null;
}
