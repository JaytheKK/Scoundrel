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

const POTION_NAMES = {
  en: {
    2: 'Minor Health Potion',
    3: 'Lesser Health Potion',
    4: 'Small Health Potion',
    5: 'Medium Health Potion',
    6: 'Large Health Potion',
    7: 'Greater Health Potion',
    8: 'Major Health Potion',
    9: 'Superior Health Potion',
    10: 'Supreme Health Potion',
  },
  de: {
    2: 'Kleiner Heiltrank',
    3: 'Geringer Heiltrank',
    4: 'Schwacher Heiltrank',
    5: 'Mittlerer Heiltrank',
    6: 'Großer Heiltrank',
    7: 'Starker Heiltrank',
    8: 'Mächtiger Heiltrank',
    9: 'Überlegener Heiltrank',
    10: 'Höchster Heiltrank',
  },
};

function potionNameFor(rank) {
  const table = POTION_NAMES[getLang()] || POTION_NAMES.en;
  return table[rank] || null;
}
