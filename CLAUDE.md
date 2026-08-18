# Scoundrel — Project Notes

A browser-based implementation of **Scoundrel**, the single-player dungeon-crawler
card game by Zach Gage & Kurt Bieg, built with plain HTML/CSS/JavaScript
(no framework, no build step — just open `index.html`).

## Game Rules (reference for implementation)

- **Deck (44 cards):** a standard 52-card deck with the jokers removed, plus
  all red face cards (J, Q, K of Hearts and Diamonds) and both red Aces removed.
- **Suits / roles:**
  - **Clubs & Spades** → Monsters. Value = attack strength
    (2–10 face value, J=11, Q=12, K=13, A=14).
  - **Diamonds** → Weapons (value 2–10, higher = stronger).
  - **Hearts** → Health Potions (value 2–10, higher = more healing).
- **Health:** player starts at 20 HP, max 20 HP.
- **Rooms:** 4 cards are dealt face-up as a "room". The player resolves 3 of
  the 4 cards (in any order); the 4th card is left and carried over into the
  next room (which is then filled back up to 4 new cards).
- **Fleeing a room:** the player may avoid an entire room once, but not two
  times in a row. Fleeing puts the whole room back at the bottom of the deck.
- **Fighting monsters:**
  - Barehanded: take full damage equal to the monster's value.
  - With an equipped weapon: damage = monster value − weapon value
    (minimum 0). The weapon can only be used on a monster whose value is
    **lower than the last monster it defeated** — once used on a "too strong"
    monster, further use degrades/limits it. Equipping a new weapon discards
    the old one (and any monster stacked on it).
- **Potions:** drinking a potion heals HP up to the max of 20. Only the
  **first** potion consumed in a given room actually heals — any additional
  potion in the same room has no effect (still must be resolved/discarded).
- **Win condition:** clear all 44 cards from the dungeon.
- **Lose condition:** HP drops to 0 or below.

> Note: rule details above are from memory of the original game — double-check
> edge cases (e.g. weapon degrade rule, potion stacking) against the official
> rules PDF if something feels off, and adjust this file when corrected.

## Conventions

- Plain **vanilla JavaScript**, no frameworks, no npm build step.
- Files (loaded in this order from `index.html`):
  - `index.html` — page structure
  - `style.css` — styling
  - `fonts/` — self-hosted woff2 fonts (Metamorphous, MedievalSharp), both
    SIL Open Font License — free for commercial use, see
    `fonts/LICENSE-fonts.txt`. Use `var(--font-display)` (Metamorphous) for
    dramatic one-off text (title, win/lose banner) and `var(--font-ui)`
    (MedievalSharp) for buttons/UI chrome. Keep card numbers, HP/deck counts,
    and status/message text in `var(--font-body)` (plain system font) —
    decorative faces hurt quick readability for things read during play.
  - `js/cards.js` — the 44 card definitions (data only)
  - `js/monster-icons.js` — `MONSTER_NAMES`, a plain rank (2-14) → creature
    name lookup used for the card tooltip (e.g. "7 of Clubs — Shadow
    Assassin"). The actual artwork is separate — see "Monster artwork" below.
  - `js/state.js` — game state + rules logic (fight/equip/drink, room refill,
    win/lose). **No DOM code here** — keeps rules testable/reasoned about on
    their own, independent of rendering.
  - `js/ui.js` — rendering only (cards, HP bar, weapon slot, message). Reads
    `state`, contains no game rules.
  - `js/main.js` — wiring: click handlers call into `state.js`, then trigger
    re-renders via `ui.js`. Also owns the resolve animation timing
    (`CARD_ANIMATION_MS`, kept in sync with the CSS transition duration).
- Everything user-facing (card names, buttons, messages) is in **English**.
- Build incrementally: deck/shuffle → room mechanic → combat/weapon/potion
  logic → win/lose conditions → UI polish. Verify each step before moving on.
- Win/lose is shown via `#gameover-overlay` (full-screen, dimmed, original
  CSS-only banner — no image assets) with a "Play Again" button; see
  `renderGameOverBanner()` in `js/ui.js`.
- HP changes show a floating combat number (green "+N" up / red "-N" down,
  see `showHpDelta()` in `js/ui.js`) — triggered in `js/main.js` by
  comparing `state.hp` before/after `resolveCard()`, not by threading a
  delta value through `state.js`. Any future action that changes `state.hp`
  gets the animation for free as long as it goes through that same
  before/after comparison in `main.js`.
- **New Game / rules:** the top-left button is a hamburger icon (`#menu-btn`)
  that opens `#menu-overlay` — a popup containing the New Game button and
  the full written rules (kept in `#rules` in `index.html`; update that
  text if a rule changes). `startNewGame()` in `js/main.js` is the single
  shared entry point for starting/restarting a game — the start screen's
  New Game button, the menu's New Game button, the game-over screen's Play
  Again button, and the empty-room call-to-action (shown via `renderRoom()`
  in `js/ui.js` whenever `state.room.length === 0`, e.g. before the first
  game) all call it, so they can't drift out of sync with each other.
- **Main/start screen:** `#start-screen` and `#game-screen` are both direct
  children of `<body>` (which is still the flex column doing the page
  centering — see Responsive sizing below); exactly one is ever visible at
  a time, via `.hidden` (`display: none`), toggled by `showStartScreen()` /
  `showGameScreen()` in `js/main.js`. The page loads into `#start-screen`
  first (large logo, tagline, a New Game button, and a row of Champions /
  Weapons / Monsters / Anleitung buttons); `startNewGame()` calls
  `showGameScreen()` as its last step. The in-game hamburger menu got a
  second button, `#back-to-menu-btn` ("Main Menu"), so the start screen is
  reachable at any time during a game too — it does NOT reset or pause game
  state, it just swaps which screen is visible, so returning to a game in
  progress currently only works by starting over (no "Continue" affordance
  exists — add one if that's ever needed instead of assuming it's implied).
  "Anleitung" deliberately just calls `openMenu()` — it reuses the exact
  same `#menu-overlay` rules content instead of duplicating the rules text
  anywhere.
  - **Champions/Weapons/Monsters galleries:** `#gallery-overlay` reuses
    `#menu-overlay`'s exact CSS chrome (dimmed backdrop, panel, close
    button, title — see the shared selectors in `style.css`, e.g.
    `#menu-overlay, #gallery-overlay, #champion-select-overlay { ... }`)
    rather than duplicating it, so any visual tweak to one automatically
    applies to the others. `openGallery(kind)` in `js/main.js` calls
    `renderGallery(kind)` (in `js/ui.js`), which fills `#gallery-grid` with
    one tile per item straight from the existing data: weapons use
    `images/weapons/<rank>.png` + `weaponNameFor()` for ranks 2–10, monsters
    use `images/monsters/<rank>.png` + `monsterNameFor()` for ranks 2–14,
    and champions iterate the fixed `CHAMPIONS` roster in
    `js/champion-icons.js` instead of a rank range (see below).
    - **Item detail popup:** clicking a weapon/monster/champion tile opens
      `#gallery-detail-overlay` — portrait, name, and either "Strength N" +
      a short flavor description (weapons/monsters) or the "Passive
      Ability" text (champions) — on top of the still-open gallery (its own
      selectors in `style.css`, not merged into the shared `#menu-overlay`/
      `#gallery-overlay` group above, since its panel layout differs:
      narrower, with a portrait and a subtitle line the other two don't
      have). `js/main.js` delegates a single click listener on
      `#gallery-grid` (tiles are fully rebuilt on every `renderGallery()`
      call, so one delegated listener beats one-per-tile) reading
      `dataset.kind`/`dataset.key` off the clicked `.gallery-item` (set in
      `buildGalleryItem()`, `js/ui.js`) to call `openGalleryDetail(kind,
      key)` — `key` is a rank number for weapons/monsters, or a champion id
      string for champions (only the former gets coerced with `Number()`
      before the call). The description text comes from
      `weaponDescriptionFor(rank)`/`monsterDescriptionFor(rank)`
      (`js/weapon-icons.js`/`js/monster-icons.js`) or a champion's own
      `description` field (`js/champion-icons.js`) — short flavor/ability
      blurbs, not used anywhere else (card tooltips still only show the
      name).
    - **Keep the gallery in sync with the card/champion data — this is a
      standing rule, not a one-off.** Whenever a new monster or weapon
      rank/card is added, or a new champion is added, the corresponding
      Hauptscreen gallery must be updated in the same change: add its name
      to `MONSTER_NAMES`/`WEAPON_NAMES` (and a matching entry in
      `MONSTER_DESCRIPTIONS`/`WEAPON_DESCRIPTIONS`) in `js/monster-icons.js`/
      `js/weapon-icons.js`, or a new entry to the `CHAMPIONS` array in
      `js/champion-icons.js`, and make sure its artwork exists at
      `images/monsters/<rank>.png`/`images/weapons/<rank>.png`/
      `images/champions/<id>.png` — `renderGallery()` in `js/ui.js` iterates
      every rank in a fixed range for weapons/monsters (2–10 / 2–14) but the
      whole `CHAMPIONS` array for champions, so a new champion only needs an
      entry added there, no range to extend. A new *kind* of card/roster
      entry (not just a new rank/champion) needs its own
      `renderGallery()`/`renderGalleryDetail()` branch, its own gallery
      button on `#start-screen`, and its own `*_NAMES`/`*_DESCRIPTIONS` (or
      equivalent) data file, following the same pattern as weapons and
      monsters. Never let the gallery silently fall out of date with what
      the deck/roster actually contains.
  - **Champion-select screen:** every "New Game" entry point (start
    screen's button, the hamburger menu's button, the game-over screen's
    "Play Again", and the empty-room call-to-action) opens
    `#champion-select-overlay` (`openChampionSelect()` in `js/main.js`)
    instead of starting a game directly — the game only actually starts
    once a tile in `#champion-select-grid` is clicked (delegated listener
    in `js/main.js`), which calls `startNewGame(championId)`. Each tile
    (`buildChampionSelectItem()` in `js/ui.js`) shows its full ability text
    inline rather than opening a separate detail popup, since there are
    only 4 champions and picking one is meant to feel as immediate as
    clicking a card in-game — no separate "confirm" step. `initGame()` in
    `js/state.js` now takes a `championId` param and stores it on
    `state.champion`; each passive is implemented inline, gated on that id,
    right where it's relevant — Paladin/Berserker in `fightMonster()`,
    Herbalist in `drinkPotion()` (raises the "only first potion heals per
    room" cap from `state.potionsDrunkThisRoom`), Rogue in `fleeRoom()`
    (raises the "can't flee twice in a row" cap from `state.fleeStreak`) —
    rather than a separate champion-effects module; add a new champion's
    logic the same way unless/until champions get numerous or complex
    enough to warrant their own `js/champion-effects.js` (mirroring
    `js/weapon-effects.js`).
  - **Portrait placeholder for missing artwork:** `fillPortrait()` in
    `js/ui.js` is the shared null-image fallback for any portrait-shaped
    slot (gallery tile, gallery detail popup, champion-select tile,
    `#champion-badge`) — same idea as `fillCardFace()`'s suit-symbol
    fallback for cards. When a champion's `image` is falsy it shows a
    dashed-outline box with a plain letter monogram instead of a broken
    `<img>`. **Use a plain letter, never an emoji, for this kind of
    placeholder** — an earlier emoji shield (🛡) badge didn't render on
    every system/font tested (see Weapon Effects below), so letters are
    the deliberately-boring, reliably-rendering default for any future
    placeholder too. All 4 champions have real artwork now (see "Champion
    artwork" below), so this path is dormant until a 5th champion is added
    without art yet — leave a new champion's `image` as `null` in that
    case rather than pointing it at a file that doesn't exist; the
    placeholder disappears automatically once the real path is set, no
    other code changes needed.
  - **Champion portrait next to the HP bar:** `#champion-badge` (a small
    circular portrait, styled in `style.css`) sits inside `#hp-bar-wrapper`
    to the left of the bar, filled by `renderChampionBadge()` (`js/ui.js`,
    called from `renderAll()`) via the same `fillPortrait()` used
    everywhere else. `#hp-bar`'s width was deliberately shortened (13.75rem
    → 11.25rem) by exactly the badge's width plus one flex `gap`
    (1.75rem + 0.75rem = 2.5rem) so the badge+bar group together take up
    the same total width the bar alone used to — keep that relationship
    if either size ever changes, rather than letting the row grow wider
    than before.
- **Responsive sizing:** almost every size in `style.css` is in `rem`, not
  `px`, on purpose. The root `html` font-size scales by media-query
  breakpoint (16px phone / 18px tablet ≥640px / 22px small desktop / 24px
  desktop — 24px is exactly 1.5x the 16px base), which scales general UI
  (buttons, HP bar, banner, text) together. When adding new sized elements,
  use `rem` (not `px`) so they stay part of this scaling — the only things
  intentionally left in `px` are hairline borders (1-2px) where scaling
  would just blur them.
- **The page must never need scrolling, at any screen size.** This is a
  hard requirement, not just a nice-to-have — verify with the browser at
  several widths/heights (phone, tablet, common laptop sizes like
  1280x720/1366x768, and desktop) after any layout change, checking
  `document.documentElement.scrollHeight <= window.innerHeight`. Two
  mechanisms make this work:
  - Room/weapon-slot card sizing uses dedicated `--card-scale` /
    `--weapon-slot-scale` tokens (via `calc()`), decoupled from the root
    font-size — cards have a hard constraint plain text doesn't (all 4 room
    cards must fit on **one row**, never wrap to 2x2) that needed separate
    control. `#room` is `flex-wrap: nowrap` for this reason.
  - Every breakpoint (`--card-scale`, `--stack-gap`, and the root
    `font-size` together) requires a minimum viewport **height** as well as
    width before stepping up a tier — measured against this page's actual
    content height at that tier, with a safety margin. So a wide-but-short
    window (e.g. a 1280x720 laptop) automatically falls back to a smaller
    tier instead of overflowing. A `max-height: 480px` tier (e.g. a phone
    in landscape) is the final safety net.
  - `#message` is capped to 2 lines via `-webkit-line-clamp` so a long
    fight/flee message can never push the page taller.
  - **Gotcha:** a safety-net media query needs to be placed in the source
    **after** the base rules for whatever it overrides (e.g. `h1`, `button`),
    not just after other media queries — same-specificity CSS rules are
    resolved by source order, so a media query earlier in the file loses to
    a later unconditional rule even when its condition matches. The
    `max-height: 480px` block is deliberately the very last thing in
    `style.css` for this reason.
  - Also note: the browser's default `body { margin: 8px }` was a silent
    contributor to overflow until it was reset with `html, body { margin: 0 }` —
    check for this if measurements don't add up.

## Card architecture (important — read before adding/editing cards)

- Every card is defined **individually** in `js/cards.js` via its own
  `makeCard(suit, rank, overrides)` call — not generated in a loop. This is
  deliberate: it keeps each of the 44 cards independently editable/extendable.
- **One file per card is intentionally NOT used** for the base 44 — they're
  pure data with no unique behavior, so one shared `cards.js` list is enough.
  Once a specific card gets a real special-ability, give **that card** (and
  only that card) its own file under `js/effects/` (create the folder when
  the first one is needed), and reference it from that card's `overrides` in
  `cards.js` (e.g. an `effectId` matched to a lookup, or a directly imported
  handler). Don't pre-create 44 effect files "just in case."
- Each card has an `image` field. When `null` (nothing currently sets it to
  null — every card gets artwork automatically, see the artwork sections
  below), `fillCardFace()` in `js/ui.js` falls back to a suit-symbol
  placeholder. Set a card's `image` to a file path and the renderer
  automatically shows that image instead — no other code changes needed.
- `rank` is a card's CURRENT strength; `baseRank` (added alongside it,
  never changes after creation) is its identity. Some effects can lower a
  monster's `rank` at runtime (see Weapon Effects below) — artwork and
  flavor-name lookups must always use `baseRank`, everything gameplay-facing
  (damage math, the displayed number, tier/aura) must always use `rank`.
  Don't key art/name lookups off `rank` or a weakened monster will show the
  wrong creature.
- `effect` holds a weapon-effect id (`'vampiric'`/`'electric'`/`'sturdy'`,
  or `null`) — see "Weapon Effects" below. This is a *type-wide*, randomly
  rolled effect (any of the 9 weapon cards can get one), which is a
  different pattern from a specific named card having a fixed unique
  ability: for the latter (e.g. a one-of-a-kind legendary item), give
  **that card** its own file under `js/effects/` (create the folder when
  the first one is needed) and reference it from that card's `overrides`
  in `cards.js`, rather than reusing the `effect` string field.

## Weapon Effects (custom addition, not part of the original Scoundrel rules)

- Every weapon card has a 25% chance of getting one of three effects,
  re-rolled at the start of every game — `rollWeaponEffects()` in
  `js/weapon-effects.js`, called once from `initGame()` in `js/state.js`.
  `WEAPON_EFFECTS` in that same file holds each effect's name/icon/
  description (used for the card's corner badge, tooltip, and
  `#weapon-status`); the actual gameplay logic lives in `fightMonster()` in
  `js/state.js` since it needs `state`.
  - **Vampiric** — heals 1 HP whenever the weapon defeats a monster.
  - **Electric** — every *other* monster currently in `state.room` loses 1
    strength (via `weakenMonster()`, floor of 1) whenever the weapon is
    used in a fight. Only `rank` (and the `label`/`name` derived from it)
    changes — `baseRank` and `image` don't, so the monster stays visually
    and nominally the same creature, just weaker.
  - **Sturdy** — `state.weaponMaxMonster` (the "can only defeat monsters
    weaker than X" ceiling) can drop by at most 2 per fight instead of
    dropping straight to the defeated monster's value.
- Badge icons are plain letters (V/E/S), not emoji — an emoji shield
  (🛡) didn't render on every system/font tested, while a plain letter
  always does. Keep this in mind if adding more effects later: prefer a
  letter/simple-glyph badge over an emoji unless you've verified it
  renders broadly.
- **Electric gets its own hit feedback**, separate from the normal HP-loss
  feedback: a floating "-1" plus a brief shake on each monster it weakens.
  `fightMonster()` in `js/state.js` returns the ids of every monster it
  weakened this fight as `weakenedIds`, threaded back through
  `resolveCard()`. `resolveAndAnimate()` in `js/main.js` reads
  `result.weakenedIds` and, for each one, calls `showCardDamage()` (in
  `js/ui.js`) and adds `.card--shake` — both **before** the
  `CARD_ANIMATION_MS` timeout that calls `renderRoom()`, while the weakened
  cards' actual DOM elements (not the fought card, which is already
  removed from `state.room` by then) are still the ones on screen.
  - `showCardDamage()` deliberately does **not** reuse `#hp-float-container`
    (which anchors over the HP bar) — it's a per-card effect, so it needs
    its own position. It appends a `.card-float` span straight to
    `<body>`, positioned via `getBoundingClientRect()` on the target card
    and `position: fixed` (not `absolute`, and not a child of the card
    element) — because `renderRoom()` replaces that card's DOM element
    well before the 1.1s float animation finishes; anchoring to the
    card itself would cut the animation short. Same shared
    `hp-float-up`/`hp-float-down` keyframes as the HP bar's numbers, so
    the two feel identical.
  - `.card--shake` (`card-shake` keyframes in `style.css`) is a small,
    brief **`translateX`-only** wobble — same reasoning as `.card--aura`
    below: a whole-card translate doesn't drag the bottom value label out
    of place the way a `transform: scale()` from the center would.

### Monster artwork

- `images/monsters/<rank>.png` (2-14, one file per rank — both suits of a
  given rank share the same monster and image) are transparent-background
  black silhouette PNGs, assigned automatically in `makeCard()` in
  `js/cards.js`. They came from a user-supplied sprite sheet
  (`images/MonstersIcons.jpeg`, kept as the source reference) that was
  cropped and alpha-masked with a Python/PIL script (see git history for
  the exact script — it wasn't kept as a project file since it's a one-off
  tool, not part of the running game).
- **Known mismatch, already corrected for:** two of the sprite sheet's
  printed labels don't match their artwork — the box labeled "Brutmutter
  (Riesenspinne)" is visually a golem, and the box labeled "Spinnennetz" is
  visually the giant spider. The rank assignment follows what's actually
  drawn: rank 10 (Golem) uses the "Brutmutter" artwork, rank 12 (Brood
  Mother) uses the "Spinnennetz" artwork. If more monster art is added
  later from the same or a similar sheet, double-check the artwork against
  `MONSTER_NAMES` in `js/monster-icons.js` rather than trusting a printed
  label.
- The card face shows only the artwork (or suit symbol) plus the card's
  plain numeric value at the bottom (`.card-value-label`) — no rank text in
  the middle of the card. **No J/Q/K/A letters anywhere in the game, full
  stop** — this used to be card-face-only with `card.label` still holding
  the letters for `card.name`/tooltips/log text ("Fought J of Clubs..."),
  but that was explicitly rejected: `RANK_LABELS` in `js/cards.js` now maps
  11-14 to the strings `'11'`-`'14'` instead of `'J'/'Q'/'K'/'A'`, so
  `card.label`/`card.name` and every gallery tile (`js/ui.js`) show plain
  numbers everywhere, not just on the card face. If a new display of a
  card's rank is ever added, it should read from `card.label`/`rank`
  (already plain numbers) rather than reintroducing a letter lookup.
- **No flat top-color bar on cards.** An earlier version used a solid
  `border-top` strip colored by type (monster/weapon/potion) — replaced by
  a full border whose width/saturation/glow scale with the card's strength
  tier (`cardTier(rank)` in `js/ui.js`, 1 weakest through 5 strongest; see
  `.card--tier-N` in `style.css`). Apply this same tier class to any new
  place a card is rendered (it's already done for both room cards and the
  equipped weapon in the weapon slot).
- **Border/glow color is per-card, not just per-type.** Each card's
  `--edge-rgb` (an "R, G, B" string used inside `rgba()`) can come from
  three places, in increasing priority: the base `.card--monster` /
  `.card--weapon` / `.card--potion` CSS class (a type default), a
  tier-specific override like `.card--monster.card--tier-5` (see monsters
  below), or — highest priority — an inline style set from `card.glowRgb`
  (`js/cards.js`) via `applyGlowColor()` in `js/ui.js`. Weapons default to
  white through `glowRgb`, which exists specifically so a *specific* weapon
  can get its own glow color later (e.g. a fire weapon passing an orange
  `glowRgb` through `makeCard`'s `overrides`) without touching the shared
  tier system — this is the intended extension point once per-card effects
  exist, not a one-off.
- **Monsters get gloomier at high tiers via an inward dark vignette, not a
  darker edge color** — `--card-glow-inset` (invisible by default, a real
  `inset` shadow only on `.card--monster.card--tier-4/5`) is a **separate
  token from `--card-glow`** (the outer glow) specifically so it stays
  visible/legible rather than just dimming the whole color into the dark
  page background. `--edge-rgb` on `.card--monster` is a dark-ish purple by
  request, but keep it well short of near-black — that was tried once and
  read as "barely visible" rather than "gloomy".
- **Pulsing glows animate `opacity` on a `::after`, never `box-shadow`
  directly.** Both `.card--aura::after` and `.card--potion::after` are an
  absolutely-positioned, card-shaped layer (`inset: 0; border-radius:
  inherit;`) holding one **fixed, pre-computed** peak-glow `box-shadow`;
  the shared `card-glow-fade` keyframe only animates that layer's
  `opacity` between 0 and 1. Two real bugs led here, in order: (1) an
  earlier version animated `box-shadow` itself (varying blur/spread each
  frame) — this forces a full repaint every frame, which is not
  GPU-accelerated and looked janky/stuttery with several cards pulsing at
  once; opacity is compositor-only and is always smooth regardless of how
  many cards animate together. (2) before that, a version of the box-shadow
  keyframe swapped between a shadow list that included an `inset` shadow
  (rest state) and one that didn't (peak state) — browsers can't smoothly
  interpolate a shadow list when a position's inset-ness changes, which
  caused a visible white flash. The fixed-shadow-plus-opacity-fade pattern
  sidesteps both problems at once, so **any new pulsing/glowing effect
  should follow the same `::after` + opacity pattern** rather than
  animating `box-shadow`'s own numbers.
  `--card-glow` / `--card-glow-inset` (the *static*, unanimated resting
  glow set per tier — see below) are unaffected by any of this; they still
  render underneath the fading overlay at all times.
- **The very strongest cards get a pulsing `.card--aura`, not just a
  bigger glow.** `hasAura(card)` in `js/ui.js` — true for monsters rank
  11-14 and weapons rank 8+ (the 3 strongest) — adds `.card--aura`,
  whose `::after` flares the outer glow gently brighter and back on top of
  the normal tier border/glow (not instead of it). Keep this subtle
  (moderate glow numbers) — an earlier, stronger version was reported as
  too intense, though it was later bumped back up ~10% after also being
  reported as a bit weak once the flash bug was fixed — tune from the
  current numbers, don't reset to either extreme. **Glow-only on purpose,
  no `transform`/scale:** an earlier version also scaled the card up/down
  each pulse, which visibly dragged the bottom value label up and down
  each cycle (scale grows a box from its center, moving its content with
  it) — don't reintroduce a transform on `.card--aura` without checking
  the value label stays put. (A rotating gradient ring behind the card,
  `card-aura-spin`, was tried too but wasn't noticeable in practice and
  was removed — don't re-add spin-based effects without checking they
  actually read at card scale.)

### Potion artwork

- `images/potions/<rank>.png` (2-10, one file per rank) came from a
  user-supplied sheet (`images/HealPotsIcons.jpeg`, kept as source
  reference), cropped the same way as the monster art but keeping color
  this time (alpha = 255 − min(R,G,B) per pixel, not forced to black) so
  the red potion liquid stays visible against the transparent background.
  Names are in `POTION_NAMES` in `js/potion-icons.js`.
- Potions get an extra **"life pulse"** on top of the normal strength-tier
  border (`.card--potion` / `card-potion-pulse` in `style.css`): the glow
  breathes in and out continuously, on every potion regardless of tier —
  added because a static border (even a colored one) read as boring for a
  healing item.

### Weapon artwork

- `images/weapons/<rank>.png` (2-10, one file per rank) came from a
  user-supplied sheet (`images/WeaponsIcons.jpeg`, kept as source
  reference), cropped like the monster art (forced to black, alpha-masked).
  That sheet had thin box-border-line fragments left behind by a naive crop
  in some corners, so the crop script also keeps only the largest connected
  shape per icon (via `scipy.ndimage.label`) and discards the rest — worth
  reusing that step for any future sprite-sheet crop, not just re-cropping
  tighter. Names are the sheet's own (e.g. "Mjölnir", "Excalibur"), in
  `WEAPON_NAMES` in `js/weapon-icons.js`.
- Weapons don't (yet) have their own type-specific flourish the way potions
  get the life-pulse — they currently only get the shared tier system plus
  their own glow color via `glowRgb` (see above). If weapons get a
  distinguishing animation/effect later, add it the same way the potion
  pulse was added: a new class + keyframes layered on top of, not
  replacing, the tier system.

### Champion artwork

- `images/champions/<id>.png` (one file per champion, keyed by id rather
  than a rank — champions aren't cards) came from a user-supplied 2x2
  sprite sheet (`images/ChampionsIcons.jpeg`, kept as source reference:
  top-left Paladin, top-right Herbalist, bottom-left Rogue, bottom-right
  Berserker), cropped similarly to the monster/weapon art but with one
  deliberate difference: **plain `alpha = 255 − min(R,G,B)` is not enough
  for line-art portraits.** A first pass used that plain formula and left
  thin single-pixel linework (eyes especially — Herbalist/Rogue/Berserker
  all lost eye detail) at very low alpha (~15-35/255), because JPEG
  compression anti-aliases thin lines into light gray rather than solid
  black. At low alpha those lines are nearly invisible against the light
  `--card-bg` they render on (though they can look deceptively fine in a
  raw image viewer/preview on a dark background, which is why this shipped
  unnoticed once already — always preview champion art composited on a
  light background, not just as a bare transparent PNG). The fix: contrast-
  stretch the darkness value before using it as alpha —
  `alpha = clip((darkness − LOW) / (HIGH − LOW), 0, 1) × 255` with
  `LOW≈12, HIGH≈90` — so any pixel meaningfully darker than the paper-white
  background snaps close to fully opaque instead of staying a faint gray.
  After that: tightly cropped to the alpha mask's bounding box with a
  small padding, same as the monster/weapon art. Apply this same
  contrast-stretch (not the plain monster/weapon formula) to any future
  line-art crop (more champions, or any other non-silhouette art) —
  silhouette-style monster/weapon art doesn't need it since those are
  solid fills, not thin outlines.
  **Second bug, found later (all 4 champions again lost detail — Paladin's
  second eye, Herbalist's entire eyes/nose/mouth, Berserker's second eye):**
  the crop script's "largest-connected-component only" step (meant to drop
  the sheet's circle-border fragments outside each portrait) was far too
  aggressive — a face's eyes/nose/mouth are drawn as strokes that don't
  touch the outer hair/hood/helmet outline, so they're each their own
  *separate* connected component and got deleted right along with the
  actual border fragments, since only the single largest component
  survived. **Never filter line-art down to just the largest connected
  component** — instead keep every component above a tiny pixel-count
  floor (e.g. ~8px, enough to drop JPEG noise specks but keep every real
  stroke including small disconnected ones) and rely on a per-portrait
  crop rectangle to keep neighboring circles' fragments out in the first
  place. Re-verify against the source reference sheet (composited on a
  light background, per the paragraph above) after any recrop — a missing
  eye or facial feature is easy to miss at a glance since the silhouette
  still reads as "a face."
- Champions aren't cards, so this artwork never goes through
  `fillCardFace()` — it's shown via the shared `fillPortrait()` helper
  (`js/ui.js`) instead, in three places: the Champions gallery tiles, the
  champion-select screen's tiles, and `#champion-badge` next to the HP bar
  (see "Champion portrait next to the HP bar" above). If a new champion is
  added before its artwork exists, leave its `image` as `null` — see
  "Portrait placeholder for missing artwork" above.

## Interaction design decisions

- **No modal dialogs for in-game choices.** An earlier version used a popup
  to ask "fight with weapon or bare-handed?" on every monster — this was
  explicitly rejected as too interruptive. Instead: a persistent **weapon
  slot** (`#weapon-slot-card` in `index.html`, styled like a card — dashed
  outline + sword icon when empty) always shows the current weapon and its
  restriction, and a **"Using weapon" toggle** (`state.useWeaponPreference`)
  controls whether fights auto-use the weapon (when legal) or go
  bare-handed. Keep this pattern — prefer persistent, always-visible controls
  over per-action popups — for future mechanics too, unless told otherwise.
- Clicking a weapon card animates it flying from the room into the weapon
  slot (`animateWeaponToSlot()` in `js/ui.js`, a cloned/positioned element,
  not a real drag interaction).
- **Fighting a monster with the equipped weapon plays a ~2s "weapon swing"
  animation** (`animateWeaponAttack()` in `js/ui.js`): the real
  `#weapon-slot-card` element itself (not a clone) swings out to the
  clicked monster, pauses on impact, and swings back — driven by inline
  `transform`/`transition` styles set directly on the slot (position/
  z-index temporarily set inline too, so it renders above other UI while
  flying) rather than a clone left floating over the slot, which previously
  read as a visual glitch (a duplicate card stuck on the slot). Because the
  slot's own element is being animated, its `onImpact` callback re-renders
  the slot mid-flight (`renderWeaponSlot()` rewrites className/innerHTML)
  without interrupting the animation — only *inline* styles carry the
  animation, and those survive a className/innerHTML change untouched.
- **Room-card clicks are serialized through an action queue**
  (`actionQueue`/`enqueueRoomAction()` in `js/main.js`), because clicking
  rapidly used to interleave animations and let a second click's state
  change (card gone, HP lost, weapon-slot updated) land before the first
  click's animation had visually finished. Now every click's actual effect
  waits for its own animation to fully play out, and the next queued click
  only starts once that happens. To keep the queue from feeling sluggish
  during a rapid-click streak, a click that arrives while a previous one is
  still animating doesn't jump the queue — it nudges the *currently
  playing* animation to finish in half its remaining time instead (see
  `animateTransform()`/`speedableTimeout()` in `js/ui.js`, both returning a
  `{ speedUp }` controller). Speeding up snaps the animated element to its
  current mid-transition visual position (via `getComputedStyle`) before
  resuming toward the same end target in less time, specifically so a
  speed-up is never visible as a jump. Once a swing has been sped up, every
  remaining leg of that same swing also starts pre-sped-up (the "2x" is a
  standing flag for the rest of that animation, not a one-off nudge), and
  further clicks piling up on top don't stack further speed. Any future
  room-card animation should be wired through this same queue (register a
  `speedUp` via the `registerSpeedUp` callback the queued action receives,
  and call `onFinished()` once fully done) rather than firing immediately,
  or rapid clicking will reintroduce the same interleaving bug.

## Local dev / preview

- `.claude/launch.json` runs a plain `python -m http.server` on port 5173 so
  the game can be previewed with working JavaScript (opening `index.html`
  directly via `file://` also works, but some preview tools only render a
  static snapshot without executing scripts).
