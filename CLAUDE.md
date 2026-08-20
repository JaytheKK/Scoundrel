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

## Safe start (custom addition, not part of the original Scoundrel rules)

- The first two rooms of a game can't be "monotype" (4 monsters, 4 weapons,
  or 4 potions/shields all at once) — a 4-monster room in particular can
  come close to killing a fresh 20 HP player outright with no weapon to
  fall back on, and two such rooms in a row leave no recourse at all, since
  fleeing a second room straight after fleeing the first isn't normally
  allowed. From room 3 onward there's no restriction, exactly as before
  this feature existed.
- Implemented as **rejection sampling, not a scripted/rigged deck** —
  `drawForRoom()` in `js/state.js` performs a full, fair Fisher–Yates
  reshuffle of the still-undealt portion of the deck and checks the room it
  would produce (`isRoomTypeSafe()`); if that room is monotype, it
  reshuffles and checks again (capped at 100 attempts, which in practice is
  never come close to). Every attempt is a completely fair shuffle, so the
  result stays fully random and unpredictable, it only excludes the narrow
  slice of outcomes that would otherwise hand the player an unfair death
  through no fault of their own. Deck composition and overall difficulty
  are unaffected, only the order of the first two rooms is nudged, and only
  away from that one specific shape — this does not make the game easier.
- `state.roomsDealt` counts how many rooms have been dealt so far this game
  (the initial deal counts as 1); `drawForRoom()` only applies the
  reshuffle-and-check loop while it's below `SAFE_ROOM_LIMIT` (2). This is
  tracked by room count, not by deck position, so it also covers fleeing
  room 1 (the flee-redeal becomes room 2 and is protected) the same way it
  covers a normal 3-cards-resolved refill.
- Fleeing pushes the fled room to the bottom of the deck before drawing a
  replacement — `drawForRoom()`'s `protectedTailCount` param excludes those
  just-appended cards from the reshuffle, so a fled card can never be
  immediately reshuffled back into the very next room; it stays at the
  bottom like the flee rule promises.
- The Tutorial's fixed, hand-ordered deck (`state.scriptedDeck`, set from
  `initGame()`'s `options.deck`) is exempt entirely — `drawForRoom()` skips
  the reshuffle loop whenever it's set, since reordering the scripted deck
  would break the tutorial's hand-verified room-by-room script.

## Conventions

- **No em dashes ( — ) in any text you write for this project.** This
  applies to user-facing copy (rules text, messages, button labels), code
  comments, and this file. Use a comma or a period instead. Existing em
  dashes already in this file/codebase don't need to be hunted down and
  replaced on sight, but don't introduce new ones.
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

## Shields (custom addition, not part of the original Scoundrel rules)

- A third equippable item type on top of weapons/potions: 3 cards, ranks
  3-5, added on top of the standard 44-card deck (`makeCard(SUITS.SHIELDS,
  ...)` in `js/cards.js`) — the deck is 47 cards total, not 44. Shields use
  their own pseudo-suit (`SUITS.SHIELDS = 'shields'`) purely so they flow
  through the existing `makeCard()`/`renderCard()`/deck plumbing like every
  other card; it isn't a real playing-card suit. Names/flavor text live in
  `js/shield-icons.js` (`SHIELD_NAMES`/`SHIELD_DESCRIPTIONS`), mirroring
  `js/weapon-icons.js`.
- **Block + durability:** a shield's `rank` does double duty as both how
  much damage it blocks per fight *and* its remaining durability — the same
  "rank is current strength, baseRank is identity" split used for a
  weakened monster (see `weakenMonster()`). Equipping a fresh shield sets
  both to its starting value; every point of damage it blocks lowers `rank`
  (and the `label`/`name` derived from it) by that same amount, and once
  `rank` reaches 0 the shield shatters — `state.equippedShield` is cleared
  and the shield slot goes back to empty. All of this lives in
  `fightMonster()` in `js/state.js`, right after the existing weapon/
  bare-handed damage calculation, so a shield only ever blocks damage that
  actually gets through — it stacks with a weapon, never replaces it:
  weapon (or bare hands, plus Berserker's flat reduction) reduces the
  monster's damage first, and only whatever remains left over is what the
  shield can absorb. E.g. a 3-block shield against a 5-damage hit that a
  weapon already reduced to 2 blocks all 2 (shield drops to 1 durability,
  player takes 0); the same shield against a full 5-damage bare-handed hit
  blocks 3 and shatters, player still takes the remaining 2.
- **Equip UI mirrors weapons exactly, deliberately** — a shield slot
  (`#shield-slot-card`) sits immediately left of the weapon slot inside a
  shared `#equipment-slots` row, same size/scale tokens
  (`--weapon-slot-scale`), same "flies from the room into the slot"
  animation on click (`animateShieldToSlot()` in `js/ui.js`, a near-exact
  copy of `animateWeaponToSlot()`) and the same `renderShieldSlot()` /
  `renderWeaponSlot()` pairing called together everywhere. Keep any future
  weapon-slot UI change (sizing, animation timing, etc.) mirrored onto the
  shield slot unless there's a specific reason not to, so the two equip
  slots keep feeling like the same system. The empty slot's placeholder
  icon is a plain letter "S" (`.shield-icon`), not an emoji shield — same
  reasoning as the Weapon Effects badges below (an emoji shield glyph
  didn't render reliably in testing).
- Shields currently have **no weapon-style rolled effects** (Vampiric/
  Electric/Sturdy) and no "using shield" toggle — a shield's block is
  always applied automatically whenever one is equipped, there's no
  bare-handed-equivalent opt-out the way weapons have `useWeaponPreference`.
  Add one the same way the weapon toggle works if that's ever wanted.
- **Block feedback: shake if it survives, shatter if it breaks.**
  `fightMonster()` returns `shieldBlocked`/`shieldBroke` alongside its
  message (mirroring `weakenedIds` for the Electric weapon effect), and
  `applyResolve()` in `js/main.js` reacts to them the same way it reacts to
  `weakenedIds` — fired directly, not routed through the room-card action
  queue, since (like the Electric shake) this is feedback on a
  persistent piece of UI, not a room card being removed.
  - **Survives (`shieldBlocked` but not `shieldBroke`):** `renderShieldSlot()`
    draws the shield's new, lower durability first, then
    `animateShieldShake()` (`js/ui.js`) plays the same `.card--shake` wobble
    used for an Electric-weakened monster on top of it. It explicitly
    removes-then-re-adds the class (with a forced reflow in between) rather
    than just adding it, so back-to-back hits each restart the shake —
    `classList.add()` alone is a no-op if the class is already present and
    wouldn't retrigger the CSS animation.
  - **Breaks (`shieldBroke`):** `animateShieldShatter()` (`js/ui.js`) must
    run **before** `renderShieldSlot()` — it clones the slot's *current*
    card face (still showing the shield, since resolveCard() already
    mutated `state` but nothing has re-rendered yet) into 6 pie-slice
    shards (each clipped via an inline `clip-path` polygon computed from
    its slice's angle, together reconstructing the whole card), flings them
    outward with per-shard `--shatter-dx/dy/rot` custom properties and a
    slight random rotation, hides the real slot for the ~650ms flight, then
    calls `onDone()` — only then does the caller call `renderShieldSlot()`,
    so the empty slot appears exactly as the shards finish fading. Calling
    it in the other order would clip empty/blank shards instead of the
    shield's artwork.
    - Each shard clone has its `id` attribute stripped
      (`shard.removeAttribute('id')`) — cloning `#shield-slot-card` six
      times would otherwise leave 6 duplicate ids in the DOM for the
      animation's duration, which risks `getElementById('shield-slot-card')`
      calls elsewhere resolving to a shard instead of the real slot.
- **"Used" state while damaged but not broken:** once an equipped shield's
  `rank` drops below its `baseRank` (it took damage this fight but survived
  — see the block logic above), `renderShieldSlot()` swaps its artwork to a
  second, cracked version of the same shield — `shieldDamagedImageFor(baseRank)`
  in `js/shield-icons.js`, pointing at `images/shields/<rank>-damaged.png`
  (cropped from a second user-supplied sheet, `images/BrokenShieldIcons.jpeg`,
  same layout/order as `images/ShieldIcons.jpeg` — see "Shield artwork"
  below). Still keyed off `baseRank`, not `rank` — same identity-vs-current-
  strength split as everywhere else, just swapping in a second art asset
  instead of only changing the displayed number. Implemented by building a
  shallow `{ ...shield, image: <damaged path> }` copy and passing *that* to
  `fillCardFace()` rather than the real shield card object, so `state`
  itself never holds a "damaged" image path — only the render call does.
  (An earlier version also added a static crack-line overlay across the
  whole card face on top of this artwork swap — deliberately dropped, not
  wanted; if a similar overlay effect is ever requested again, don't assume
  this is what was meant.)
- The Shields gallery (`shields-btn` on `#start-screen`, sits between
  Weapons and Monsters) follows the same `renderGallery()`/
  `renderGalleryDetail()` pattern as Weapons/Monsters, with one deliberate
  difference: its detail popup's strength line reads **"Block N"**, not
  "Strength N" — a shield's number is a block/durability value, not an
  attack or heal amount, so labeling it "Strength" would be misleading.
  Keep that distinction if shields ever get more display surfaces.

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

### Shield artwork

- `images/shields/<rank>.png` (3-5, one file per rank) came from a
  user-supplied sheet (`images/ShieldIcons.jpeg`, kept as source reference:
  left-to-right an oak-leaf kite shield, a round Viking-style shield, and a
  heraldic lion-crest shield, assigned ranks 3/4/5 respectively), cropped
  with the **champion-style contrast-stretch alpha** (`alpha = clip((darkness
  − LOW) / (HIGH − LOW), 0, 1) × 255`, `LOW≈12, HIGH≈90`), not the plain
  monster/weapon `alpha = 255 − min(R,G,B)` formula — the shield sheet is
  thin line art like the champion sheet, not solid silhouette fills like
  monsters/weapons, so it needed the same fix for faint anti-aliased lines
  going near-invisible (see "Champion artwork" below for the full
  explanation of why). A tiny-pixel-count floor (~8px) on connected
  components dropped JPEG noise while keeping every real stroke, same as
  the champion crop. Names are in `SHIELD_NAMES` in `js/shield-icons.js`.
- `images/shields/<rank>-damaged.png` (3-5) is a second, cracked/battered
  version of each shield (see "'Used' state while damaged but not broken"
  above), cropped from `images/BrokenShieldIcons.jpeg` — a second
  user-supplied sheet, same left-to-right layout/order as `ShieldIcons.jpeg`
  so the same crop script (column-group splitting + the champion-style
  contrast-stretch alpha) could be reused unchanged, just pointed at the
  new source file and a `<rank>-damaged.png` output name instead of
  `<rank>.png`.

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

## Champion Active Abilities (custom addition, not part of the original Scoundrel rules)

- On top of the passive granted at champion-select (see "Champion-select
  screen" above), every champion has a **mana-costed active ability** — the
  mana resource itself (gaining it, spending it, the ring gauge, the
  disabled look) is fully wired up for all four, and all four champions'
  actual effects are now implemented (see `useAbility()` in `js/state.js`):
  Paladin's and Berserker's live in `fightMonster()`, since they affect
  incoming damage; Herbalist's is entirely self-contained inside
  `useAbility()`, since it's a one-shot heal with no ongoing effect
  elsewhere; Rogue's is the odd one out, needing a target — see below. Add
  any future champion's ability the same way: gated on `state.champion`
  inside `useAbility()` for the activation itself, plus wherever in
  `js/state.js` the effect actually needs to apply.
- **Rogue's ability — "Backstab":** the only one of the four that needs a
  target, so it doesn't resolve instantly like the others — clicking
  `#ability-btn` arms **targeting mode** instead of spending mana straight
  away:
  - `useAbility()` sets `state.rogueTargeting = true` and returns early,
    skipping the `state.mana = 0` line entirely (that line moved below the
    Rogue branch specifically so Rogue can opt out of it) — mana is only
    actually spent once a monster is chosen. A second click of the ability
    button while already armed is a no-op (`useAbility()` returns `null`);
    the only way to arm it again is to finish or cancel the current one
    first.
  - While `state.rogueTargeting` is true, `renderRogueTargeting()`
    (`js/ui.js`, called from `renderAll()` and after anything that changes
    the flag) adds `.card--targetable` — a continuous wiggle, reusing
    `.card--shake`'s translateX-only keyframe on a loop rather than
    inventing a new one — to every monster card in the room
    (`#room .card--monster`), and un-hides `#ability-cancel-btn`, a small
    ✕ badge pinned to `#ability-wrap`'s top-right corner (styled from
    scratch, overriding the generic `button` rule's rectangular-carved-
    stone look — see its own comment in `style.css`). Clicking that badge
    calls `cancelBackstab()`, which turns targeting back off **without**
    spending any mana — the ability stays fully charged for later. This is
    the same `#ability-wrap`-not-`#ability-btn` placement lesson as the
    golden glow above: the ✕ needs to sit outside the button's own box, so
    it can't live on the button itself.
  - The `#room` click listener (`js/main.js`) checks
    `state.rogueTargeting` first and, if set, routes the click to
    `handleBackstabClick()` instead of the normal `handleCardClick()`.
    Clicking a non-monster card while armed just shows a hint message and
    changes nothing — only a monster is a valid target, and the ✕ badge
    (not a stray card click) is the documented way to back out.
    `handleBackstabClick()` still goes through the same
    `enqueueRoomAction()` queue as every other room-card click, so it can't
    interleave with an in-flight fight/equip/drink animation.
  - `resolveBackstab(cardId)` (`js/state.js`) is what actually spends the
    mana and turns targeting back off, then deals the hit via
    `weakenMonster(card, 6)` — the same rank-reduction helper the Electric
    weapon effect already used at amount 1 (generalized to take an
    `amount` argument for this). Backstab **never removes a monster from
    the room outright**, no matter how weak it already is —
    `weakenMonster()`'s existing floor-at-1 behavior applies here exactly
    like it does for Electric, so a monster at or below 6 just drops to
    rank 1 and still needs to be fought/resolved normally afterward, same
    as any other monster card. If an instant-kill-on-low-rank version is
    ever wanted instead, that needs new logic (mirroring `resolveCard()`'s
    room-refill/win-condition handling for an outright removal) — it
    isn't what's implemented now.
- **Herbalist's ability:** a flat one-shot heal — `useAbility()` heals
  `min(3, maxHp - hp)` HP immediately, same clamped-at-max pattern as
  `drinkPotion()`. Returns `{ message, healed }`, where `healed` is the
  actual HP restored (0 if already at full HP) — the ability-button click
  handler (`js/main.js`) reads that generic `healed` field (not a
  Herbalist-specific check) to decide whether to play the usual HP-delta
  float (`showHpDelta()`, the same one every other heal/damage source
  uses) and `showAbilityHealBurst()`'s "+" particle flourish, the same
  "state.js returns a flag, the UI reacts to the flag generically" pattern
  `fightMonster()` already uses for `weakenedIds`/`shieldBlocked`. A future
  healing ability should return `healed` the same way rather than
  reinventing its own feedback path.
  - **The particle burst:** `showAbilityHealBurst()` (`js/ui.js`) spawns
    5-7 short-lived `.ability-heal-particle` "+" marks as children of
    `#ability-wrap` (not `<body>` + `getBoundingClientRect()` like
    `showCardDamage()` uses for room cards) — the ability button is a
    permanent fixture `renderAll()` never tears down mid-animation, unlike
    a room card, so there's no need for that workaround here. Each mark
    gets a random angle/distance (as a % of `#ability-wrap`, so it scales
    with the button at every breakpoint) and a small random animation
    delay, so a burst never looks identical twice, then removes itself via
    `setTimeout` once its `ability-heal-particle-float` animation finishes.
- **Paladin's ability — "Blessing":** activating it sets
  `state.paladinResistCharges = 3`. `fightMonster()` (`js/state.js`) then
  reduces the next 3 hits that would deal any damage by 3 each (never below
  0, and never counting a hit that was already fully stopped by the weapon
  as one of the 3), decrementing the counter each time, applied right where
  Berserker's passive flat reduction is (after the weapon/bare-handed damage
  is known, before the shield block — a shield only ever blocks whatever's
  still left over after this too; Berserker's own active ability, "Rage",
  reuses this exact same spot too — see below). The counter hitting 0 is what ends the
  effect; there's no separate timer or "3 more hits" any other way, so it
  can span across fights, rooms, even a flee in between — only fights that
  would otherwise deal damage burn a charge.
  - **The golden "still active" glow** is `.ability-wrap--active` (a
    pulsing `::after`, see the CSS for why it's opacity-only) toggled by
    `renderAbilityActiveGlow()` (`js/ui.js`), purely off
    `state.paladinResistCharges > 0` — no separate "is the buff active"
    flag needed, the charge counter doubles as that flag. Called from
    `renderAll()` and after anything that can change the counter: fighting
    (`applyResolve()` in `js/main.js`) and activating the ability. A future
    champion's own ongoing-effect indicator should extend this same
    function rather than adding a parallel glow system.
    - **Gotcha — this glow deliberately lives on `#ability-wrap`, not
      `#ability-btn`:** `#ability-btn` is a real `<button>`, so it inherits
      the generic `button { overflow: hidden; }` rule (used there to clip
      that rule's own hover "sheen" sweep — see "buttons" further up in
      `style.css`). An `::after` glow put on `#ability-btn` itself hits a
      dead end either way: left as `overflow: hidden`, the glow's non-inset
      `box-shadow` (which always paints outside its own box) gets silently
      clipped away — it computes correctly (visible via `getComputedStyle`)
      but never actually shows on screen. Overridden to
      `overflow: visible` instead, the glow shows, but so does the
      button's *own* hover sheen — normally invisible, parked off to the
      left waiting to sweep across on hover — which now escapes its clip
      too and reads as a stray bar sliding out from the button. Neither
      option works, so the glow's `::after` was moved to `#ability-wrap`
      instead: a plain `div` with no such baggage, sized/centered to match
      the button (`--ability-size`) rather than `inset: 0` (which would
      size it to the whole wrap, ring included). Any future glow/decoration
      that needs to extend past a `<button>`'s own box should live on a
      non-button ancestor the same way, not on the button itself.
- **Berserker's ability — "Frenzy":** deliberately **not** another
  damage-reduction counter — an earlier version ("Rage") reduced incoming
  damage by 4 for 3 hits, the exact same mechanic as Paladin's Blessing
  under different flavor text, which read as a reskin rather than a
  distinct ability once actually played. Frenzy instead lifts a
  *restriction* rather than reducing damage, so it occupies different
  system space entirely:
  - Activating it sets `state.berserkerFrenzyCharges = 3`.
    `isWeaponUsableOn(card)` (`js/state.js`) then ignores
    `weaponMaxMonster` (the "weapon can only be used again on a monster
    weaker than the last one it defeated" degrade rule) entirely while
    `berserkerFrenzyCharges > 0` — a fully degraded weapon can strike any
    monster again, full stop.
  - The charge ticks down on **every one of the next 3 weapon fights**,
    whether or not the override was actually needed that particular fight
    — a plain, predictable "next 3 weapon fights" counter. `fightMonster()`
    still separately computes `frenzyOverrode` (from the pre-fight
    `weaponMaxMonster` value, before it gets overwritten for the next
    fight) purely to pick the right flavor text — "overpowered the
    weapon's limit" when it was actually blocked, vs. a plainer "Frenzy is
    active" when the swing would've been legal anyway — but `frenzyActive`
    (just "was the weapon used while charges > 0") is what actually
    decrements the counter.
    - **Bug/gotcha, found via playtesting:** an earlier version *only*
      decremented on a fight `frenzyOverrode` was true for (mirroring
      Paladin's "only counts if there was actually damage to reduce"
      rule), reasoning a charge shouldn't be "wasted" on a swing that was
      already legal. This looked fine in isolated tests but broke in real
      play: the very first frenzied kill of a strong monster sets
      `weaponMaxMonster` (the ceiling) to that monster's high rank — same
      formula as any other kill — which then makes the weapon legally
      usable on almost everything for a long stretch afterward. The
      restriction stops engaging, so the remaining charge(s) never get
      spent, and the ability button/status line sit stuck showing e.g.
      "1 left" indefinitely while the player keeps fighting freely — it
      looks like the ability never expires. Reported by the player as "the
      limit never goes away even though it still says 1 left" after
      killing ~10 monsters. Fixed by making the charge unconditional (see
      above) — **don't reintroduce an "only spend it when it mattered"
      version of a fight-count-based charge** unless the countable event is
      guaranteed to keep recurring at a steady rate; here it wasn't, because
      using the ability changes the very condition (`weaponMaxMonster`)
      that would trigger its own future use.
  - The degrade ceiling (`weaponMaxMonster`) still updates normally after a
    Frenzied swing (same Sturdy-aware formula as any other fight) — Frenzy
    only lifts the restriction check for that one swing, it doesn't stop
    the weapon from degrading. A later, non-Frenzied (or charge-exhausted)
    swing still respects whatever ceiling that fight left behind.
  - Same golden `.ability-wrap--active` glow as Paladin's Blessing —
    `renderAbilityActiveGlow()` has an `||` branch for
    `state.champion === 'berserker' && state.berserkerFrenzyCharges > 0` —
    and the counter hitting 0 is what ends the effect, same "can span
    fights/rooms/flees" behavior as Paladin's.
  - `renderWeaponSlot()` (`js/ui.js`) also reflects Frenzy directly in
    `#weapon-status`'s restriction line while active (`"Frenzy overrides
    the degrade limit (N left)"` instead of the normal `"Can only defeat
    monsters weaker than X"`), since that line would otherwise keep
    claiming a restriction that doesn't currently apply. Called both from
    the normal post-fight re-render and right after activating the ability
    (`js/main.js`'s ability-button handler), so the status text updates
    immediately on activation, not just after the next fight.
  - **Lesson for future champion abilities:** if a new ability ends up
    being "reduce/increase a number by X for N uses" in the same spot
    another champion's ability already occupies, prefer lifting/granting a
    *rule exception* instead (bypassing a restriction, changing what's
    legal) so each champion's active ability is mechanically distinct, not
    just reskinned flavor text over the same math.
- **Mana cost per champion** — the numbers to tweak if these ever need
  rebalancing — lives in one place: `ABILITY_MANA_COST` in
  `js/ability-icons.js` (`abilityManaCostFor()` reads from it everywhere
  else). Currently: Paladin 5, Herbalist 4, Rogue 3, Berserker 4.
- **Ability name/description text** — the plain-language explanation shown
  in both the rules screen and the info popup below — lives in one place
  too: `ABILITY_DETAILS` in `js/ability-icons.js` (`abilityDetailsFor()`).
  Keep this in sync with the actual mechanic whenever an ability's numbers
  change (e.g. Blessing's "3" or Frenzy's "3 weapon fights") — same
  "single source of truth, everything else reads from it" pattern as
  `ABILITY_MANA_COST`.
- **Rules screen:** `#rules`' Champions section (`index.html`) lists each
  champion's passive **and** active ability together, one `<li>` per
  champion — the passive on the first line (unchanged from before active
  abilities existed), the active ability's name and effect on a second
  line (`<br><em>Name</em> — effect...`). This text is written by hand to
  match `ABILITY_DETAILS`, not generated from it (the rules screen is
  static HTML, no JS render pass) — so a future ability change needs BOTH
  `ABILITY_DETAILS` and this `<li>` updated together, the same
  "don't let docs drift from the real mechanic" discipline the rest of the
  rules text already follows for weapons/shields/etc.
- **Ability info popup:** a small blue "i" badge, `#ability-info-btn`, is
  pinned to `#ability-wrap`'s **bottom-right** corner (`#ability-cancel-btn`
  — Rogue's Backstab ✕ — already owns the top-right corner, so the two
  never collide; same "pin a small badge to the wrap, not the button
  itself" placement pattern used throughout this section, just the
  opposite corner). Hovering or focusing it reveals `#ability-info-popup`,
  a small panel showing the current champion's active-ability name +
  description (from `ABILITY_DETAILS` above). This one is pure CSS, no
  click handler: `#ability-info-btn:hover + #ability-info-popup` /
  `:focus + #ability-info-popup` (plus `#ability-info-popup:hover` so
  moving the mouse from the badge into the popup itself doesn't instantly
  close it) fades it in via opacity/visibility/transform, following the
  same "don't animate layout-affecting properties" spirit as the rest of
  the project's hover/pulse effects. `renderAbilityInfo()` (`js/ui.js`,
  called from `renderAll()`) only fills in the popup's text and
  shows/hides the badge itself (`.hidden` before any champion is picked)
  — it doesn't need to be re-run after every action the way
  `renderManaRing()`/`renderAbilityActiveGlow()` are, since the ability's
  name/description never changes mid-game for a given champion.
  - **Gotcha — the popup is anchored by its own right edge, not
    centered:** `#ability-wrap` is the rightmost item in `#equipment-slots`
    and sits close to the page's right edge on narrow screens. A popup
    centered under/above the badge (`left: 50%; transform:
    translateX(-50%)`) would risk overflowing off-screen there; anchoring
    it with `right: 0` instead (so it only ever grows leftward from a
    fixed point) keeps it fully on-screen regardless of where
    `#ability-wrap` itself lands. Verified at both 1280×800 and a 375×812
    mobile viewport — no off-screen overflow, no page-scroll overflow
    (the popup is `position: absolute`, so it never affects layout/
    `scrollHeight` either way). Any future hover popup pinned near a
    page edge should anchor the same way rather than centering.
- **Gaining mana:** `state.mana` (`js/state.js`) starts at 0 each game
  (`initGame()`) and increases by 1 via `gainMana()` every time the room
  changes — either a room clearing/refilling back up to 4 cards (called
  from the room-refill branch in `resolveCard()`) or a successful flee
  (called from `fleeRoom()`, only on the path that actually flees, not the
  early-return "can't flee" messages). `gainMana()` clamps the result to
  that champion's `ABILITY_MANA_COST` — mana doesn't keep climbing past the
  cost, since nothing reads it past that point anyway (the ability is
  simply usable, and stays usable, until spent).
- **Spending mana:** `useAbility()` (`js/state.js`) is the only way
  `state.mana` goes back to 0 — it requires `state.mana >= ABILITY_MANA_COST`
  (returns `null`, changing nothing, otherwise) and is wired to a click on
  `#ability-btn` in `js/main.js`.
- **The mana ring** (`#mana-ring`, inside a new `#ability-wrap` that also
  contains `#ability-btn`) is deliberately built to look like
  `#champion-ability-bar`'s discrete filled/unfilled segments (see
  "Champion-select screen" above) — same idea, just bent into a ring around
  the ability button instead of a straight bar, and blue (`--mana-rgb` in
  `style.css`) instead of green. `renderManaRing()` (`js/ui.js`) computes
  one segment per point of `ABILITY_MANA_COST` (so 3-5 segments depending on
  champion) as a single CSS `conic-gradient` — not one DOM element per
  segment, since the segment count varies — with small angular gaps between
  segments to read as discrete steps rather than one solid ring. The ring
  sits *behind* the button (`z-index: 0` vs. the button's `1`) and is sized
  bigger than it by `--ring-thickness` on every side, so the button's own
  opaque circular background covers the ring's center and only its outer
  rim shows — a plain CSS "sits behind + button covers the middle" trick
  instead of a masked donut shape.
  - **Gotcha (conic-gradient angles):** the segment loop must start at
    `0deg` and only ever grow, never use a negative starting offset. CSS
    `conic-gradient()`'s `0deg` already points straight up (12 o'clock) and
    sweeps clockwise — unlike a math angle where `0deg` points right — so
    there's no need to subtract 90° to "start at the top". An earlier
    version started the loop at `-90deg` for that reason, which pushed
    every stop into negative degrees; browsers clamp a stop position below
    `0deg`, which silently cut off the last ~90° of the ring (it only ever
    filled 3/4 of the way around, no matter how much mana was banked).
    Keep every stop within `[0deg, 360deg]`.
  - **Gotcha (hover lift must move the ring too):** the hover lift
    (`translateY(-2px)`) is applied to `#ability-wrap`, the shared parent —
    never to `#ability-btn` alone. `#mana-ring` and `#ability-btn` are two
    separate absolutely-positioned children of that wrap; lifting only the
    button used to slide it up away from a ring that stayed put, which
    broke the "button covers the ring's center" illusion the instant you
    hovered — you'd briefly see the ring's full circle, not just its rim,
    in the gap the button left behind. Since `.ability-btn--disabled`
    lives on the button but the hover rule needs to live on the wrap,
    `renderManaRing()` mirrors that disabled state onto the wrap too as
    `.ability-wrap--disabled`, so `#ability-wrap:hover:not(.ability-wrap--disabled)`
    can gate the lift on readiness without a `:has()` selector. Any future
    hover/lift effect on this button+ring pair should stay on the wrap for
    the same reason.
- **Disabled look:** `renderManaRing()` also toggles `.ability-btn--disabled`
  (grayscale + dimmed, mirroring `.weapon-slot-inactive`) on `#ability-btn`
  whenever `state.mana < ABILITY_MANA_COST` — the button looks and acts
  normal (full color, hover lift) the instant enough mana is collected, and
  stays that way until actually used, per the "usable any time once ready"
  requirement (mana isn't spent just by *having* enough, only by clicking).
- `renderManaRing()` is called from `renderAll()` (new game) and after
  every action that can change `state.mana`: room clear/flee (via
  `applyResolve()`/the flee button handler in `js/main.js`) and using the
  ability itself.
- `#ability-btn` is a circular button that sits immediately **right of the
  weapon slot**, inside the same `#equipment-slots` row as the shield and
  weapon slots (order: shield, weapon, ability) — deliberately circular
  rather than another card shape, so it reads as a distinct "ability"
  affordance instead of a third equip slot. It's sized off the same
  `--card-scale`/`--weapon-slot-scale` tokens the other two slots use, so
  it scales in step with them at every breakpoint (see "Responsive sizing"
  above) — any future resize of the equip slots should keep the ability
  button in that same proportion.
- `renderAbilityButton()` (`js/ui.js`, called from `renderAll()`, same
  pattern as `renderChampionBadge()`) fills `#ability-icon` with the
  current champion's icon from `abilityIconFor()` in `js/ability-icons.js`
  — a plain id → image-path lookup mirroring `champion-icons.js`.
- Artwork lives at `images/abilities/<championId>.png`, cropped from a
  user-supplied 1x4 sprite sheet (`images/AbilitiesIcons.jpeg`, kept as the
  source reference: left to right, a radiant sunburst for Paladin, a
  heart+cross for Herbalist, a dagger for Rogue, a clenched fist for
  Berserker — the same order as `CHAMPIONS` in `js/champion-icons.js`).
  Cropped with the same contrast-stretch alpha as the champion portraits
  (see "Champion artwork" below) since this is thin line art, not a solid
  silhouette fill. Unlike the champion portrait sheet, this sheet's four
  icons were **not drawn at a consistent size** (the sunburst and fist are
  visually much bigger than the dagger) — the crop step scaled each icon so
  its longest side fills the same fraction of a shared square canvas before
  centering it on that canvas, specifically so the button doesn't look like
  it's showing a smaller icon for some champions than others. Apply the
  same normalize-then-center-on-a-shared-canvas step to any future icon
  sheet whose entries aren't already a consistent size.
- Add a new champion's icon the same way the gallery/portrait art is kept
  in sync (see "Keep the gallery in sync with the card/champion data"
  above): add an entry to `ABILITY_ICONS` in `js/ability-icons.js` and
  supply `images/abilities/<id>.png`, or leave it unmapped (falls back to
  no icon shown) if the art isn't ready yet.

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

## Tutorial (custom addition, not part of the original Scoundrel rules)

- A guided, one-time walkthrough of one real (but fully pre-arranged)
  dungeon run, entirely in `js/tutorial.js`. It's opt-in only, no
  `localStorage` first-visit tracking: a "Tutorial" button sits at the start
  of `#start-nav` on the start screen, the same discoverability level as
  Champions/Weapons/Monsters/How to Play, and it can be replayed any number
  of times. This was a deliberate choice over auto-launching it on first
  visit, accounts (which would make "has this player seen it" easy and
  durable to track) don't exist yet, and a plain button is simpler than
  standing up `localStorage` tracking for a single boolean that'll likely
  need re-plumbing once accounts do exist.
- **Always the Paladin, no champion-select screen.** Every other "New Game"
  entry point opens `#champion-select-overlay` first (see "Champion-select
  screen" above); the Tutorial deliberately skips that and calls
  `startNewGame('paladin', ...)` directly. One fewer decision for a
  brand-new player before they've even seen the game, and it keeps the
  whole scripted run's numbers (see below) verifiable against exactly one
  champion's passive/active ability instead of four.
- **Reuses the real game engine end to end, no separate tutorial rules
  logic anywhere.** The only two differences from a normal game: the deck
  is a fixed, hand-picked list of cards instead of a shuffle, and the
  champion is fixed. Every fight/equip/drink/flee/ability click goes
  through the exact same `resolveCard()`/`fightMonster()`/`fleeRoom()`/
  `useAbility()` (`js/state.js`) and the exact same click handlers and
  animations (`js/main.js`/`js/ui.js`) a real game uses.
  - `initGame()` (`js/state.js`) gained an `options.deck` param: an
    already-ordered array of full card objects used verbatim instead of
    `shuffle(getFreshDeck())`, and `rollWeaponEffects()` is skipped entirely
    for a scripted deck (a random Vampiric/Electric/Sturdy roll would throw
    off the tutorial's hand-tuned damage numbers, `buildTutorialDeck()` in
    `js/tutorial.js` also forces `effect: null` on every card itself, belt
    and suspenders). `startNewGame()` (`js/main.js`) just threads an
    `options` param through to `initGame()` unchanged, so it stays the one
    shared entry point for starting a game (see "New Game / rules" above),
    `startTutorial()` calls it exactly like any real "New Game" would, just
    passing a champion and a deck instead of opening champion-select.
  - `getCardById(id)` (`js/cards.js`) is a plain lookup into `CARD_LIST` by
    id (e.g. `"clubs-7"`), added specifically so `TUTORIAL_DECK_IDS` in
    `js/tutorial.js` could reference exact cards by name instead of
    duplicating their data.
- **The scripted deck (`TUTORIAL_DECK_IDS`, `js/tutorial.js`) is 17 cards,
  hand-verified room by room against the real engine's rules** (weapon
  degrade ceiling, shield block/durability, Paladin's every-5th-kill
  passive, potion-per-room cap) so every damage number and every rule
  demonstration is exact, not approximate:
  - **Room 1:** fight bare-handed (no weapon yet) → equip a weapon → fight
    again with it (damage = monster − weapon) → a potion is deliberately
    left unresolved, carrying into room 2.
  - **Room 2:** the carried potion heals, a second potion in the same room
    doesn't (only the first per room does) → a monster stronger than the
    weapon's current degrade ceiling forces a bare-handed fight → a shield
    is left unresolved, carrying into room 3.
  - **Room 3:** equip the shield → a monster it partially blocks (shield
    survives, lower durability) → a second, harder monster whose damage
    exceeds the shield's remaining durability, shattering it (this is
    specifically the **2nd monster in this room**, matching how the shield
    is introduced, see the shield HP/durability math below). This fight is
    also the game's 5th monster kill, so Paladin's passive (heal 3 HP every
    5 kills) fires here too, entirely for free, no separate step needed,
    the normal fight message already announces it.
  - **Room 4:** fled whole (not resolved card by card) specifically to
    demonstrate the flee mechanic and the "not twice in a row" cap, the
    3 filler cards dealt alongside the one carried-over card are never
    clicked.
  - **Room 5** (dealt fresh after fleeing): a potion tops HP back up, then
    `state.mana` is force-set to the Paladin's ability cost (a tutorial-only
    shortcut, `before()` on that step in `TUTORIAL_STEPS`, since normally
    mana only trickles in 1 per room change via `gainMana()`, and grinding
    out several more real room changes just to reach the ability once would
    kill the pacing) so Blessing can be triggered and immediately shown
    reducing the next hit by 3.
  - HP is tracked by hand across the whole script and never drops below
    ~7/20 (ends there, after the final Blessing-reduced hit), tuned
    deliberately so the run always survives to the end screen. **Any future
    edit to `TUTORIAL_DECK_IDS`, `TUTORIAL_STEPS`, or the rules those steps
    exercise (weapon degrade math, shield block math, Paladin's passive/
    active) must be re-walked by hand the same way**, there's no
    lose-condition guard beyond `showTutorialStep()`'s defensive
    `state.gameOver` check, which just ends the tutorial early rather than
    letting numbers be wrong.
- **UI: dim everything except the current target, rather than a full-page
  overlay with a cutout.** An overlay-plus-cutout approach would have to
  fight the existing weapon-attack/shield-shatter z-index choreography
  (`animateWeaponAttack()`/`animateShieldShatter()` in `js/ui.js`) for very
  little benefit here. Instead `body.tutorial-active` (`style.css`) dims and
  `pointer-events: none`s every non-target interactive element (room cards,
  Flee, the ability button, the weapon toggle), and the current step's one
  clickable target gets `.tutorial-target` layered on top, which, via higher
  CSS specificity, not `!important`-free overrides, restores its
  clickability and adds a pulsing gold outline. A floating "coachmark"
  bubble (`#tutorial-coachmark`) with the step's explanation is positioned
  next to that target via `getBoundingClientRect()`
  (`positionCoachmarkNear()`), or centered on screen for the two info-only
  bookend steps that have no specific target (`positionCoachmarkCenter()`).
  `#tutorial-skip-btn` stays visible the whole time, in the same spirit as
  every other overlay in this project always having an obvious way out.
  - **`#menu-btn` is deliberately exempt from the dimming**, unlike every
    other interactive element, so the hamburger menu (and its "Back to
    Menu" button) stays reachable throughout the tutorial as a second,
    more familiar way out on top of `#tutorial-skip-btn`. `#tutorial-
    coachmark`/`#tutorial-skip-btn` are given a lower `z-index` than
    `#menu-overlay` for this reason too, so opening the menu covers them
    cleanly instead of the coachmark floating on top of the menu panel.
    `js/tutorial.js` adds its own listeners on `#back-to-menu-btn` and
    `#new-game-btn` that call `endTutorial()` whenever `tutorialState.active`
    is true, in addition to whatever `main.js`'s own listener on that same
    button already does, without this, leaving via the menu would abandon
    the scripted run but leave `body.tutorial-active` (and the coachmark/
    skip button) stuck on, dimming whatever real game gets started right
    after.
- **A step advances itself once its target is actually clicked**, a
  one-off (`{ once: true }`) listener attached directly to that element in
  `showTutorialStep()`, entirely separate from (and never modifying) the
  real click handlers in `js/main.js`, which fire and do the actual game
  logic exactly as they always do. After a short, per-step delay
  (`advanceDelayMs`, hand-tuned to outlast whatever that action's animation
  is, a plain fade, a weapon-fly, a full weapon-swing, or a shield-shatter
 , see the values in `TUTORIAL_STEPS`) the next step is shown; by then the
  real re-render has already finished, so the next target element reliably
  exists in the DOM. **Any new tutorial step must set `advanceDelayMs` to
  comfortably outlast its action's real animation duration** (check the
  relevant constant in `js/main.js`/`js/ui.js`, e.g. `CARD_ANIMATION_MS` or
  `WEAPON_ATTACK_OUT_MS`/`_IMPACT_MS`/`_RETURN_MS`) or the next coachmark can
  appear while the previous animation is still visibly finishing.

## Local dev / preview

- `.claude/launch.json` runs a plain `python -m http.server` on port 5173 so
  the game can be previewed with working JavaScript (opening `index.html`
  directly via `file://` also works, but some preview tools only render a
  static snapshot without executing scripts).
