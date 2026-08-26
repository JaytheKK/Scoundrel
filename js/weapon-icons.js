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

const WEAPON_NAMES = {
  en: {
    2: 'Wooden Club',
    3: 'Damaged Sword',
    4: 'Spear',
    5: 'Sword',
    6: 'Battle Axe',
    7: 'Flaming Broadsword',
    8: 'Dark Scythe',
    9: 'Mjölnir',
    10: 'Excalibur',
  },
  de: {
    2: 'Holzkeule',
    3: 'Beschädigtes Schwert',
    4: 'Speer',
    5: 'Schwert',
    6: 'Streitaxt',
    7: 'Flammendes Breitschwert',
    8: 'Dunkle Sense',
    9: 'Mjölnir',
    10: 'Excalibur',
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
    2: 'A crude, splintering club — barely better than bare fists.',
    3: 'A rusted blade, dulled by age and countless battles.',
    4: 'A long-reaching weapon, simple but effective.',
    5: 'A reliable blade, well balanced for any fight.',
    6: 'A heavy axe that cleaves through armor.',
    7: 'A broadsword wreathed in eternal flame.',
    8: 'A cursed blade that hungers for battle.',
    9: 'A legendary hammer said to summon thunder.',
    10: 'The legendary blade of kings.',
  },
  de: {
    2: 'Ein grober, splitternder Knüppel, kaum besser als bloße Fäuste.',
    3: 'Eine rostige Klinge, stumpf durch Alter und zahllose Kämpfe.',
    4: 'Eine weitreichende Waffe, einfach aber wirkungsvoll.',
    5: 'Eine verlässliche Klinge, gut ausbalanciert für jeden Kampf.',
    6: 'Eine schwere Axt, die Rüstungen spaltet.',
    7: 'Ein Breitschwert, umhüllt von ewigen Flammen.',
    8: 'Eine verfluchte Klinge, die nach dem Kampf hungert.',
    9: 'Ein legendärer Hammer, der angeblich Donner herbeiruft.',
    10: 'Die legendäre Klinge der Könige.',
  },
};

function weaponDescriptionFor(rank) {
  const table = WEAPON_DESCRIPTIONS[getLang()] || WEAPON_DESCRIPTIONS.en;
  return table[rank] || null;
}
