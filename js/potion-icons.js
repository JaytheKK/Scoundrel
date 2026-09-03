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

// Short flavor blurb shown on a potion card's flipped-over back face (see
// flipCard() in js/ui.js) — potions never had a gallery/detail popup of
// their own (there's no "Potions" button on the start screen), so this
// table didn't exist until the flip feature needed one. Same "keyed by
// language first" pattern as POTION_NAMES above.
const POTION_DESCRIPTIONS = {
  en: {
    10: 'A faint red tint, barely more than tinted water. Better than nothing.',
    15: 'A thin, watery brew that dulls the sharpest edge of pain.',
    20: 'A modest dose of restorative red liquid.',
    25: 'A well-brewed potion, the standard remedy of any adventurer.',
    30: 'A generous measure of thick, ruby-red elixir.',
    35: 'A potent brew that mends flesh almost as fast as it closes.',
    40: 'A rich, glowing tonic favored by seasoned healers.',
    45: "A rare, near-miraculous draught, worth a small fortune.",
    50: 'The finest healing draught known, said to knit bone as easily as skin.',
  },
  de: {
    10: 'Ein schwacher roter Schimmer, kaum mehr als gefärbtes Wasser. Besser als nichts.',
    15: 'Ein dünner, wässriger Sud, der die schlimmsten Schmerzen betäubt.',
    20: 'Eine bescheidene Dosis roter Heilflüssigkeit.',
    25: 'Ein gut gebrauter Trank, das übliche Mittel jedes Abenteurers.',
    30: 'Eine großzügige Menge dickflüssigen, rubinroten Elixiers.',
    35: 'Ein starker Sud, der Fleisch fast so schnell heilt wie er wirkt.',
    40: 'Ein reichhaltiges, leuchtendes Tonikum, geschätzt von erfahrenen Heilern.',
    45: 'Ein seltener, fast wundersamer Trank, ein kleines Vermögen wert.',
    50: 'Der beste Heiltrank, den man kennt, heilt angeblich Knochen so leicht wie Haut.',
  },
};

function potionDescriptionFor(rank) {
  const table = POTION_DESCRIPTIONS[getLang()] || POTION_DESCRIPTIONS.en;
  return table[rank] || null;
}
