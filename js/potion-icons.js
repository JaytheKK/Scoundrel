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
//
// Keyed by language first (see js/i18n.js), so potionNameFor() always reads
// the table for whatever getLang() currently returns.
// ---------------------------------------------------------------------------

// Keys are the ×5-rescaled rank values (see "Value rescale" note in
// js/cards.js) — old rank 2-10 is now 10-50, same steps of 5.
const POTION_NAMES = {
  en: {
    10: 'Minor Health Potion',
    15: 'Lesser Health Potion',
    20: 'Small Health Potion',
    25: 'Medium Health Potion',
    30: 'Large Health Potion',
    35: 'Greater Health Potion',
    40: 'Major Health Potion',
    45: 'Superior Health Potion',
    50: 'Supreme Health Potion',
  },
  de: {
    10: 'Kleiner Heiltrank',
    15: 'Geringer Heiltrank',
    20: 'Schwacher Heiltrank',
    25: 'Mittlerer Heiltrank',
    30: 'Großer Heiltrank',
    35: 'Starker Heiltrank',
    40: 'Mächtiger Heiltrank',
    45: 'Überlegener Heiltrank',
    50: 'Höchster Heiltrank',
  },
};

function potionNameFor(rank) {
  const table = POTION_NAMES[getLang()] || POTION_NAMES.en;
  return table[rank] || null;
}
