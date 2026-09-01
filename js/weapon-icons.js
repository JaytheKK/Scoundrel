// ---------------------------------------------------------------------------
// Scoundrel — weapon names.
// Weapon artwork itself lives in images/weapons/<rank>.png (assigned
// automatically in makeCard(), see js/cards.js) — this file just maps each
// rank to its weapon name, used for the card tooltip (see renderCard() in
// js/ui.js, e.g. "Mjölnir"). The tooltip shows only the flavor name, never
// the underlying poker-card name.
//
// Both names and descriptions are keyed by language first (see js/i18n.js),
// so weaponNameFor()/weaponDescriptionFor() always read the table for
// whatever getLang() currently returns.
// ---------------------------------------------------------------------------

// Keys are the ×5-rescaled rank values (see "Value rescale" note in
// js/cards.js) — old rank 2-10 is now 10-50, same steps of 5.
const WEAPON_NAMES = {
  en: {
    10: 'Wooden Club',
    15: 'Damaged Sword',
    20: 'Spear',
    25: 'Sword',
    30: 'Battle Axe',
    35: 'Flaming Broadsword',
    40: 'Dark Scythe',
    45: 'Mjölnir',
    50: 'Excalibur',
  },
  de: {
    10: 'Holzkeule',
    15: 'Beschädigtes Schwert',
    20: 'Speer',
    25: 'Schwert',
    30: 'Streitaxt',
    35: 'Flammendes Breitschwert',
    40: 'Dunkle Sense',
    45: 'Mjölnir',
    50: 'Excalibur',
  },
};

function weaponNameFor(rank) {
  const table = WEAPON_NAMES[getLang()] || WEAPON_NAMES.en;
  return table[rank] || null;
}

// Short flavor blurb shown in the Weapons gallery's detail popup (see
// openGalleryDetail() in js/main.js) — not used anywhere else (card
// tooltips only show the name, not this).
const WEAPON_DESCRIPTIONS = {
  en: {
    10: 'A crude, splintering club — barely better than bare fists.',
    15: 'A rusted blade, dulled by age and countless battles.',
    20: 'A long-reaching weapon, simple but effective.',
    25: 'A reliable blade, well balanced for any fight.',
    30: 'A heavy axe that cleaves through armor.',
    35: 'A broadsword wreathed in eternal flame.',
    40: 'A cursed blade that hungers for battle.',
    45: 'A legendary hammer said to summon thunder.',
    50: 'The legendary blade of kings.',
  },
  de: {
    10: 'Ein grober, splitternder Knüppel, kaum besser als bloße Fäuste.',
    15: 'Eine rostige Klinge, stumpf durch Alter und zahllose Kämpfe.',
    20: 'Eine weitreichende Waffe, einfach aber wirkungsvoll.',
    25: 'Eine verlässliche Klinge, gut ausbalanciert für jeden Kampf.',
    30: 'Eine schwere Axt, die Rüstungen spaltet.',
    35: 'Ein Breitschwert, umhüllt von ewigen Flammen.',
    40: 'Eine verfluchte Klinge, die nach dem Kampf hungert.',
    45: 'Ein legendärer Hammer, der angeblich Donner herbeiruft.',
    50: 'Die legendäre Klinge der Könige.',
  },
};

function weaponDescriptionFor(rank) {
  const table = WEAPON_DESCRIPTIONS[getLang()] || WEAPON_DESCRIPTIONS.en;
  return table[rank] || null;
}
