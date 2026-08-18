// ---------------------------------------------------------------------------
// Scoundrel — monster bestiary: one simple, original line-art icon per
// monster rank (2-14), shown on monster cards instead of the plain suit
// symbol. Kept in its own file (not cards.js) since this is presentation,
// not card data — cards.js stays free of markup strings.
//
// Every icon shares a 0 0 100 100 viewBox and draws with stroke="currentColor"
// (plus small currentColor-filled dots for eyes/details), so it automatically
// matches the card's existing text color — see .card-monster-icon in
// style.css — with no per-icon color rules needed.
// ---------------------------------------------------------------------------

const MONSTERS = {
  2: {
    name: 'Slime',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 58 C18 40 32 20 50 20 C68 20 82 40 78 58 C90 66 82 82 68 80 C60 88 40 88 32 80 C18 82 10 66 22 58 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="40" cy="52" r="4" fill="currentColor"/>
      <circle cx="60" cy="52" r="4" fill="currentColor"/>
    </svg>`,
  },
  3: {
    name: 'Skeleton',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 15 C68 15 80 30 80 48 C80 58 75 64 70 68 L70 78 L62 78 L62 70 L56 70 L56 78 L44 78 L44 70 L38 70 L38 78 L30 78 L30 68 C25 64 20 58 20 48 C20 30 32 15 50 15 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="38" cy="45" r="6" fill="currentColor"/>
      <circle cx="62" cy="45" r="6" fill="currentColor"/>
      <path d="M50 50 L46 58 L54 58 Z" fill="currentColor"/>
    </svg>`,
  },
  4: {
    name: 'Wolf',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 18 L14 42 L24 84 L50 68 L76 84 L86 42 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <path d="M50 68 L44 80 L56 80 Z" fill="currentColor"/>
      <circle cx="38" cy="48" r="4" fill="currentColor"/>
      <circle cx="62" cy="48" r="4" fill="currentColor"/>
    </svg>`,
  },
  5: {
    name: 'Armored Skeleton',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 15 C68 15 80 30 80 48 C80 58 75 64 70 68 L70 78 L62 78 L62 70 L56 70 L56 78 L44 78 L44 70 L38 70 L38 78 L30 78 L30 68 C25 64 20 58 20 48 C20 30 32 15 50 15 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <path d="M18 38 C30 28 70 28 82 38" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <circle cx="38" cy="50" r="5" fill="currentColor"/>
      <circle cx="62" cy="50" r="5" fill="currentColor"/>
    </svg>`,
  },
  6: {
    name: 'Gargoyle',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 40 C20 25 30 35 32 48" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M90 40 C80 25 70 35 68 48" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M38 20 L32 30 M62 20 L68 30" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <circle cx="50" cy="48" r="22" stroke="currentColor" stroke-width="6"/>
      <circle cx="42" cy="46" r="4" fill="currentColor"/>
      <circle cx="58" cy="46" r="4" fill="currentColor"/>
      <path d="M42 58 Q50 64 58 58" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },
  7: {
    name: 'Shadow Assassin',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 15 C68 15 78 35 78 55 L84 82 L16 82 L22 55 C22 35 32 15 50 15 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="42" cy="46" r="4" fill="currentColor"/>
      <circle cx="58" cy="46" r="4" fill="currentColor"/>
    </svg>`,
  },
  8: {
    name: 'Fire Elemental',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 12 C60 30 40 34 46 48 C36 44 32 56 40 66 C30 62 24 74 32 84 C44 92 62 90 70 78 C78 66 74 52 64 46 C68 36 62 22 50 12 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
    </svg>`,
  },
  9: {
    name: 'Minotaur',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 34 Q8 28 10 8" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path d="M70 34 Q92 28 90 8" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 38 C22 48 22 65 32 76 C40 84 60 84 68 76 C78 65 78 48 70 38 C58 28 42 28 30 38 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="40" cy="52" r="4" fill="currentColor"/>
      <circle cx="60" cy="52" r="4" fill="currentColor"/>
      <path d="M44 68 L44 72 M56 68 L56 72" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },
  10: {
    name: 'Golem',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="34" y="14" width="32" height="28" rx="4" stroke="currentColor" stroke-width="6"/>
      <rect x="20" y="46" width="60" height="36" rx="6" stroke="currentColor" stroke-width="6"/>
      <line x1="50" y1="46" x2="50" y2="82" stroke="currentColor" stroke-width="5"/>
      <circle cx="43" cy="27" r="3" fill="currentColor"/>
      <circle cx="57" cy="27" r="3" fill="currentColor"/>
    </svg>`,
  },
  11: {
    name: 'The Lich',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 24 C66 24 76 38 76 52 C76 60 72 65 68 68 L68 76 L32 76 L32 68 C28 65 24 60 24 52 C24 38 34 24 50 24 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <path d="M22 24 L30 12 L40 22 L50 10 L60 22 L70 12 L78 24" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="40" cy="48" r="5" fill="currentColor"/>
      <circle cx="60" cy="48" r="5" fill="currentColor"/>
    </svg>`,
  },
  12: {
    name: 'Brood Mother',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="50" rx="18" ry="22" stroke="currentColor" stroke-width="6"/>
      <path d="M34 38 L10 22 M34 46 L6 42 M34 56 L6 60 M34 64 L10 80" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <path d="M66 38 L90 22 M66 46 L94 42 M66 56 L94 60 M66 64 L90 80" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <circle cx="44" cy="42" r="3" fill="currentColor"/>
      <circle cx="56" cy="42" r="3" fill="currentColor"/>
    </svg>`,
  },
  13: {
    name: 'Dragon',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 50 L38 38 L46 16 L54 34 L88 30 L70 46 L86 58 L62 56 L58 74 L46 60 L26 68 Z" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="52" cy="42" r="4" fill="currentColor"/>
    </svg>`,
  },
  14: {
    name: 'Cthulhu',
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="38" r="24" stroke="currentColor" stroke-width="6"/>
      <circle cx="41" cy="34" r="4" fill="currentColor"/>
      <circle cx="59" cy="34" r="4" fill="currentColor"/>
      <path d="M30 58 Q26 70 32 80 M40 62 Q38 76 44 84 M50 64 Q50 78 50 88 M60 62 Q62 76 56 84 M70 58 Q74 70 68 80" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },
};

function monsterFor(rank) {
  return MONSTERS[rank] || null;
}
