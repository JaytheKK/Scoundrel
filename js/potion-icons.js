// ---------------------------------------------------------------------------
// Scoundrel — potion names.
// Potion artwork itself lives in images/potions/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its potion name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "Major Health Potion"). The tooltip shows only the flavor
// name, never the underlying poker-card name. Names are a plain size scale
// (Minor through Supreme) with "Health Potion" appended, deliberately
// simpler than monsters'/weapons' individually-flavored names since a
// potion has no distinct identity beyond how much it heals.
// ---------------------------------------------------------------------------

const POTION_NAMES = {
  2: 'Minor Health Potion',
  3: 'Lesser Health Potion',
  4: 'Small Health Potion',
  5: 'Medium Health Potion',
  6: 'Large Health Potion',
  7: 'Greater Health Potion',
  8: 'Major Health Potion',
  9: 'Superior Health Potion',
  10: 'Supreme Health Potion',
};

function potionNameFor(rank) {
  return POTION_NAMES[rank] || null;
}
