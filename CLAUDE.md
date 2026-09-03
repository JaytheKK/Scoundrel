# Scoundrel — Project Notes

A browser-based implementation of **Scoundrel**, the single-player dungeon-crawler
card game by Zach Gage & Kurt Bieg, built with plain HTML/CSS/JavaScript
(no framework, no build step — just open `index.html`).

## Game Rules (reference for implementation)

The original tabletop Scoundrel this project is based on uses a standard
52-card deck (jokers, red face cards, and both red Aces removed) with plain
2–10/J=11/Q=12/K=13/A=14 values. **This implementation no longer uses those
raw values** — every gameplay-facing number was multiplied by 5 in one pass
(HP, monster/weapon/potion/shield ranks, every flat passive/active-ability
amount, the safe-start threshold, card-tier breakpoints), and monsters were
additionally pulled out of the clubs/spades poker-suit framing entirely into
their own randomized pool. See the "Value rescale (×5)" note in `js/cards.js`
and the "Monster Pool" section below for the full detail; the numbers here
already reflect the current, rescaled implementation.

- **Deck (up to 47 cards per game, varies by loadout):** whichever weapon
  cards the player picked in the Deckbuilder (see "Weapon Deckbuilder"
  below, up to 10 of the 9 melee + 4 ranged cards in `js/cards.js`'s
  `CARD_LIST`, defaults to all 9 melee) + 9 potion cards + 3 shield cards
  (both always included in full, also from `CARD_LIST`) + 26 monster cards
  randomly drawn from a larger pool of 23 monster types (see "Monster Pool"
  below) — not a fixed 44/52-card deck the way the original tabletop game
  is, and not even a fixed size game to game the way it briefly was before
  the Deckbuilder existed, since the player's own weapon loadout now
  directly decides how many weapon cards (and therefore how many cards
  total) are in the deck.
- **Suits / roles:**
  - **Monsters** (own pseudo-suit, `SUITS.MONSTERS`, no longer split across
    Clubs & Spades) → value = attack strength, 10-70 across 23 types, 2 card
    instances of each type exist in the pool, 26 are drawn per game.
  - **Diamonds** → Weapons (value 10-50 in steps of 5, higher = stronger).
  - **Hearts** → Health Potions (value 10-50 in steps of 5, higher = more
    healing).
- **Health:** player starts at 100 HP, max 100 HP.
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
- **Potions:** drinking a potion heals HP up to the max of 100. Only the
  **first** potion consumed in a given room actually heals — any additional
  potion in the same room has no effect (still must be resolved/discarded).
- **Win condition:** clear all monsters from the dungeon (the moment none
  remain in the deck or room, any leftover weapons/potions/shields no longer
  matter and the game ends immediately, see `resolveCard()` in `js/state.js`).
- **Lose condition:** HP drops to 0 or below.

> Note: rule details above are from memory of the original game — double-check
> edge cases (e.g. weapon degrade rule, potion stacking) against the official
> rules PDF if something feels off, and adjust this file when corrected.

## Safe start (custom addition, not part of the original Scoundrel rules)

- The first two rooms of a game can't be "monotype" (4 monsters, 4 weapons,
  or 4 potions/shields all at once) — a 4-monster room in particular can
  come close to killing a fresh 100 HP player outright with no weapon to
  fall back on, and two such rooms in a row leave no recourse at all, since
  fleeing a second room straight after fleeing the first isn't normally
  allowed. From room 3 onward there's no restriction, exactly as before
  this feature existed.
- **On top of that**, no monster dealt into those same first two rooms may
  have strength (rank) 50 or higher (the ×5-rescaled equivalent of the
  original "rank 10 or higher" threshold, see the "Value rescale" note in
  `js/cards.js`) — only the milder monsters below that value from the pool
  are allowed there. Even a single monster at or above 50 (the strongest
  handful of the 23-type roster, previously the old J/Q/K/A-strength ranks
  plus a plain 10) can do serious damage to a fresh, weaponless player on
  its own, so this is checked as a second, independent condition
  (`hasStrongMonster()` in `js/state.js`) alongside the monotype check
  (`isRoomMonotype()`), combined in `isRoomSafe()`. A rank-50+ monster isn't
  removed from the pool, only kept out of the first two rooms specifically,
  it's just as likely to appear from room 3 onward as it always was, so
  total deck composition and difficulty are unaffected.
- Implemented as **rejection sampling, not a scripted/rigged deck** —
  `drawForRoom()` in `js/state.js` performs a full, fair Fisher–Yates
  reshuffle of the still-undealt portion of the deck and checks the room it
  would produce (`isRoomSafe()`); if that room fails either check above, it
  reshuffles and checks again (capped at 100 attempts, which in practice is
  never come close to). Every attempt is a completely fair shuffle, so the
  result stays fully random and unpredictable, it only excludes the narrow
  slice of outcomes that would otherwise hand the player an unfair death
  through no fault of their own. Deck composition and overall difficulty
  are unaffected, only the order of the first two rooms is nudged, and only
  away from those specific shapes — this does not make the game easier.
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
- **Gotcha when writing a `/* ... */` block comment (CSS or JS):** never
  let a hyphen/asterisk run right up against a following slash, e.g.
  `--art-*/--hex-*` in prose meant a literal `--art-` followed by `*` then
  `/`, which reads as `*/`, the comment-close token, and silently
  terminates the comment right there. Everything after that point (until
  the next real `*/`) gets parsed as actual code, which either throws a
  syntax error (a JS file's `<script>` tag stops executing entirely,
  breaking every function defined later in the file, e.g. `renderAll` was
  reported as "not defined" even though it plainly was, further down) or,
  worse, gets silently dropped by the parser with no visible error at all
  (a CSS parser just discards the one broken rule and recovers at the
  next `*/`, so a rule can vanish with zero console output, the actual
  cause of `.card--monster`/etc.'s `background-size: 100% 100%` rule not
  applying, first noticed as a huge, badly cropped-looking card frame
  image rather than as an error). Caught by checking whether the same
  count of `/*` and `*/` tokens appear in the file, and by `node --check`
  for JS. When prose needs to reference two hyphenated tokens together
  (`--art-*` and `--hex-*`), write `--art-... / --hex-...` or add a space
  before the slash, anything that keeps `*` and `/` from landing back to
  back.
- Plain **vanilla JavaScript**, no frameworks, no npm build step.
- Files (loaded in this order from `index.html`):
  - `index.html` — page structure
  - `style.css` — styling
  - `fonts/` — self-hosted woff2 fonts (Metamorphous, MedievalSharp), both
    SIL Open Font License — free for commercial use, see
    `fonts/LICENSE-fonts.txt`. Use `var(--font-display)` (Metamorphous) for
    dramatic one-off text (title, win/lose banner) and `var(--font-ui)`
    (MedievalSharp) for buttons/UI chrome. Card numbers stay in
    `var(--font-body)` (plain system font) — a decorative face on a number
    read at a glance mid-fight still hurts quick readability. HP/deck
    counts and status/message text (`#hp-text`, `#deck-count`,
    `#weapon-status`, `#message`) were originally kept in `var(--font-body)`
    for the same reason, but were switched to `var(--font-ui)` by request,
    to match the rest of the UI chrome now that the game has a busier
    background image behind it.
  - `js/cards.js` — the fixed weapon/potion/shield card definitions (data
    only) plus the monster pool generator, see "Monster Pool" below
  - `js/deckbuilder.js` — the weapon Deckbuilder's selection state and rules
    (which weapon cards the player has chosen to bring, and the slot-count/
    deckCost-budget limits on that choice), no DOM code, see "Weapon
    Deckbuilder" below
  - `js/monster-icons.js` — `MONSTER_NAMES`, a rank → creature name lookup
    (currently 23 ranks, 10-70) used for the card tooltip (e.g. "Shadow
    Assassin") and as the source of truth for which monster ranks exist at
    all (`getMonsterRankPool()`, see "Monster Pool" below). The actual
    artwork is separate — see "Monster artwork" below.
  - `js/state.js` — game state + rules logic (fight/equip/drink, room refill,
    win/lose). **No DOM code here** — keeps rules testable/reasoned about on
    their own, independent of rendering.
  - `js/ui.js` — rendering only (cards, HP bar, weapon slot, message). Reads
    `state`, contains no game rules.
  - `js/main.js` — wiring: click handlers call into `state.js`, then trigger
    re-renders via `ui.js`. Also owns the resolve animation timing
    (`CARD_ANIMATION_MS`, kept in sync with the CSS transition duration).
  - `js/tutorial.js` — the optional guided walkthrough, see "Tutorial" below.
  - `js/preload.js` — loaded last; preloads every card/champion/ability
    image behind `#loading-screen` before the start screen appears, see
    "Loading screen / asset preloading" below.
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
    `images/weapons/<rank>.png` + `weaponNameFor()` for ranks 10-50, monsters
    use `images/monsters/<rank>.png` + `monsterNameFor()` for whatever ranks
    `getMonsterRankPool()` currently returns (23 ranks, 10-70, as of this
    writing — see "Monster Pool" below), not a fixed range like weapons,
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
      a fixed rank range for weapons (10-50) but reads `getMonsterRankPool()`
      for monsters (see "Monster Pool" below) and the whole `CHAMPIONS` array
      for champions, so a new champion or monster rank only needs an entry
      added to its own data file, no range to remember to extend anywhere.
      A new *kind* of card/roster
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
    right where it's relevant — Paladin/Berserker/Sword Master in
    `fightMonster()`/`isWeaponUsableOn()`,
    Herbalist in `drinkPotion()` (raises the "only first potion heals per
    room" cap from `state.potionsDrunkThisRoom`), Rogue in `fleeRoom()`
    (raises the "can't flee twice in a row" cap from `state.fleeStreak`) —
    rather than a separate champion-effects module; add a new champion's
    logic the same way unless/until champions get numerous or complex
    enough to warrant their own `js/champion-effects.js` (mirroring
    `js/weapon-effects.js`).
  - **Champion-select tile frame:** each tile's background is an
    illustrated frame, `images/frames/champion.png`, following the exact
    same "stretched `background-image`" pattern as the in-game
    `.card--monster`/`--weapon`/`--potion`/`--shield` frames (see "Card
    frame artwork" below) — cropped from a user-supplied ornate carved
    wood/metal card border (`images/champions/ChampionCardIcon.jpeg`, kept
    as source reference) tightly to its own true outer edge (measured by
    gradient-based edge detection plus eyeballed correction, same as the
    other frames) so none of the sheet's surrounding wood-plank photo
    background is left in the file. Unlike the 4 in-game frames, this one
    is **not** alpha-masked or corner-rounded — the source crop already
    fills its whole rectangle with painted content edge to edge (no white/
    background halo to remove), so `.champion-select-item`'s own
    `border-radius` just clips a few opaque, similarly-dark corner pixels
    off the image, which reads as nothing.
    `.champion-select-item` locks `aspect-ratio: 1617 / 2098` (the frame's
    own native ratio) rather than letting the tile's old content-driven
    shape freely stretch the background to fit, the way the 4 in-game
    frames do — those all share a roughly card-shaped ~0.71 ratio close
    enough to `.card`'s own 100:140 box that a stretch is invisible, but
    this frame's tall, narrow ratio was different enough from the tile's
    old shape (~0.88) that stretching visibly squashed the carved corner
    details.
    **Gotcha, found via playtesting (reported as the card looking "cut
    off" at the edges) — twice needed re-cropping:** the crop was first
    tightened by eye until no wood-plank background was visible at any
    corner, which looked done, but "no wood visible" only proves the crop
    is somewhere *inside* the frame's own dark carved border, not that
    it's sitting exactly *on* the true outer edge — the border material
    and the wood backdrop are both dark brown, so a crop that had already
    eaten 40-130px into the molding on every side still looked clean at a
    glance. Found precisely the second time via per-pixel brightness
    sampling along straight (non-corner) edge sections: wood grain reads
    as a noisy ~70-110 gray value, then drops sharply below 25 right at
    the frame's true outer shadow line — cross-checked against zoomed,
    gridded crops of all 4 edges before trusting the numbers. **Any future
    recrop of `images/frames/champion.png` should use that same per-pixel
    brightness-threshold method, not an eyeballed "corners look wood-free"
    check** — and must re-measure `aspect-ratio` and the padding below
    together, they're only valid as a matched pair.
    `padding: 15.2% 14.8% 15.8% 15.2%` approximates the frame's blank
    parchment inset (hand-measured off the corrected crop, same method as
    the `--art-`/`--hex-` boxes below), so the existing portrait + name +
    desc flex column sits inside the parchment instead of overlapping the
    carved border; `justify-content: center` centers that column inside
    whatever parchment room is left over, rather than pinning it to the
    top and leaving all the slack as a gap underneath. `.champion-select-
    portrait` is now sized as a percentage of the tile (`62%` width, with
    `aspect-ratio: 1 / 1`) instead of a fixed `rem` box, so the portrait
    scales with the tile itself — this grid's columns vary fairly widely
    in width (`minmax(11rem, 1fr)`), and a fixed size looked too small in
    a wide column or cramped in a narrow one.
    - **Gotcha, found via playtesting (reported as the card frame looking
      "cropped" at the top/bottom):** `#champion-select-grid`'s default
      `align-items` is `stretch` (CSS Grid's own default) — left
      unset, every tile in a row gets stretched to match whichever sibling
      has the tallest natural content (Rogue's/Berserker's longer
      description text wraps to more lines than Paladin's/Herbalist's),
      which hands a tile a block size that's already definite from the
      grid track itself. Once a size is definite from an outside source
      like that, `aspect-ratio` no longer does anything for that axis — it
      only fills in a size that's otherwise `auto` — so the frame image
      (`background-size: 100% 100%`, which always exactly fills its box)
      silently stretched/shifted out of its intended proportions instead of
      erroring. Fixed with `align-items: start` on `#champion-select-grid`,
      so every tile sizes itself purely from its own content + `aspect-
      ratio`, independent of whatever its row siblings need. **Any future
      grid of `aspect-ratio`-locked tiles needs this same override** —
      CSS Grid's stretch-by-default silently defeats `aspect-ratio` on a
      grid item the moment row siblings differ in natural height, with no
      warning anywhere.
    - `.champion-select-desc` also carries its own small `padding: 0 0.4rem`
      on top of `.champion-select-item`'s parchment-inset padding — without
      it, a wrapped line's first/last letter could land flush against the
      parchment edge (reported as looking "pressed against the card
      border"). The item's own padding only guarantees the *card frame*
      isn't overlapped; it doesn't give the text itself any margin.
  - **Champions gallery reuses the champion-select tile frame:** opening
    "Champions" from the start screen (`#gallery-overlay`, kind
    `'champions'`) gives its tiles the same `images/frames/champion.png`
    background, `aspect-ratio`, and parchment-inset padding as
    `#champion-select-overlay` above. This is a different frame treatment
    from Weapons/Shields/Monsters below (they each reuse a real in-game
    card frame instead), and Champions is the only kind whose gallery tile
    matches its own dedicated champion-select screen rather than a
    `.card--*` type. Toggled via a `.gallery-grid--champions`
    class (`renderGallery()` in `js/ui.js` sets it on `#gallery-grid`
    whenever `kind === 'champions'`) and a `.gallery-item[data-kind=
    'champions']` attribute selector (`data-kind` was already being set on
    every tile by `buildGalleryItem()`, so no new markup was needed).
    **Gotcha:** the override rules must be written as
    `#gallery-grid.gallery-grid--champions` / `.gallery-item[data-kind=
    'champions']` and not a bare `.gallery-grid--champions` class selector
    — `#gallery-grid`'s own base rule is an id selector (specificity 100),
    which beats a bare class selector (specificity 10) regardless of
    source order, so a bare-class override silently loses the cascade and
    the base `grid-template-columns`/etc. keep applying. Also gives this
    grid its own wider column (`minmax(8.5rem, 1fr)` vs the base grid's
    `minmax(4.5rem, 1fr)`, scaled down from champion-select's `11rem` in
    the same proportion as this narrower `#gallery-panel` (`min(30rem,
    100%)`) is to `#champion-select-panel` (`min(38rem, 100%)`)) and the
    same `align-items: start` fix as champion-select's grid, for the same
    stretch-defeats-aspect-ratio reason. Unlike champion-select's tiles,
    the gallery tiles keep their existing "portrait + name only, click for
    the full passive-ability text in `#gallery-detail-overlay`" structure
    rather than also inlining the description — that separate detail-popup
    flow is a deliberate, existing interaction pattern for this screen
    (see `openGalleryDetail()` in `js/main.js`), not something this frame
    reskin was meant to change.
  - **Weapons gallery reuses the real in-game weapon card frame, not a
    new crop:** unlike Champions above (which needed its own new frame
    asset cropped for it), opening "Weapons" from the start screen
    (`#gallery-overlay`, kind `'weapons'`) reuses `images/frames/weapon.png`
    (the exact same frame asset `.card--weapon` already uses for real room
    cards, see "Card frame artwork" above) and the exact same `--art-*`/
    `--hex-*` percentages `.card--weapon` already positions its artwork/
    value number with (`15%/14%/85%/71%` and `40.3%/75.5%/59.7%/89.3%`,
    written out as plain inset percentages in `style.css` since a gallery
    tile isn't a `.card`) — no new cropping or re-measuring needed, since
    it's the identical frame at the identical 100:140 box ratio. Toggled
    the same way Champions' tiles are, via `.gallery-grid--weapons` /
    `.gallery-item[data-kind='weapons']` (`renderGallery()` in `js/ui.js`).
    Structured differently from the Champions frame on purpose: the weapon
    frame's parchment is fully occupied by the artwork box sitting right
    above the hexagon, with no spare room for a name line inside it the
    way the taller Champion frame has, so here the frame background lives
    on `.gallery-item-portrait` alone (doubling as the card box) and
    `.gallery-item-name` stays below it, in normal flex flow, rather than
    being pulled inside the frame like a Champion tile's name is.
    **Gotcha (absolutely positioned `<img>` ignores its inset box):** the
    artwork was first positioned by putting `left/top/right/bottom`
    percentages directly on the `<img>` itself with `width/height: auto`,
    mirroring `.card-art`'s box math — this looked right for a plain
    `<div>` but silently broke for an `<img>`, because an absolutely
    positioned *replaced* element (an image, unlike a div) sizes itself
    from its own intrinsic pixel dimensions when width/height are auto,
    not from the gap between its inset edges — the browser only adjusts
    `left`/`right` to fit an already-decided size, it doesn't derive the
    size from them. The artwork rendered at its full 240x240 source-image
    size, overflowing the card entirely. Fixed the same way `.card-art`/
    `.card-image` already solves this for real cards: a wrapper `<div>`
    (`.gallery-item-art`, added around the `<img>` in `buildGalleryItem()`
    only for `kind === 'weapons'`) takes the absolute inset box instead
    (a non-replaced element's auto width/height DOES fill the gap between
    insets, unlike a replaced element's), and the `<img>` inside it just
    gets plain `max-width/max-height: 100%` to scale-to-fit and center via
    flexbox — never position `left/right/top/bottom` directly on an `<img>`
    expecting it to fill that box, always use a wrapper div for this
    pattern. The value number is nested inside `.gallery-item-portrait`
    too (rather than appended as a sibling like every other kind's rank
    line), specifically so it can use the same `--hex-*` inset-box
    positioning to land in the frame's hexagon — see the `kind === 'weapons'`
    branch in `buildGalleryItem()`. Its font-size (`0.56rem`) was tuned
    down from a first attempt at `0.68rem`, which left a 2-digit value like
    "10" with zero pixel clearance against the hexagon's actual (small,
    ~16-17px) box at this tile size — verified via `canvas.measureText()`
    against the box's real rendered width, not just eyeballed.
    **Second gotcha, user-reported via screenshot comparison against a real
    in-game card (a plain rectangular white/cream box visible around the
    frame and behind the name text, where a real card has none):** only
    `.gallery-item-portrait` (the nested element the frame image itself
    sits on) had been given `background-color: transparent` — the outer
    `.gallery-item` tile itself, which is bigger (it also wraps the name
    line below the frame) and still carried its own base `background:
    var(--card-bg)` cream fill, was untouched, so that cream rectangle
    kept showing behind/around the transparent-cornered frame and behind
    the name text. This is the exact same "an opaque background-color
    painted underneath a transparent-cornered frame image reads as a
    leftover white box" issue already documented for real cards under
    "Card frame artwork" above, just one level higher up the DOM here
    (the outer tile, not the frame element's own corner mismatch) — fixed
    by adding `background-color: transparent` to `.gallery-item[data-kind=
    'weapons']` itself too. **Whenever a frame image sits on a nested
    element rather than the outermost styled box, check the outer box's
    background too, not just the element the frame image is actually on.**
    Two further tuning passes since, both by request:
    - The artwork itself (not the frame/card) is deliberately shrunk inside
      its box — `.gallery-item[data-kind='weapons'] .gallery-item-art
      img`'s `max-width`/`max-height` started at `90%` (10% shrink), later
      turned down to `85%` (15% shrink) on a follow-up request that also
      re-tuned `--weapon-shield-art-scale` (see below) by the same amount,
      not `100%`; still centered by the same flex parent either way. The
      shields gallery block carries the identical `85%` for the same
      reason (see below).
    - `.gallery-item[data-kind='weapons']`'s own padding was cut from the
      base `.gallery-item`'s `0.5rem` down to `0.2rem`, and its grid column
      widened from an initial `5.5rem` to `7.5rem` (`#gallery-grid.gallery-
      grid--weapons`) — reported (via a hover screenshot) as the tile
      overall reading too small, with a visibly loose gap between the card
      frame and the tile's own hover border (`.gallery-item:hover`'s
      `border-color: var(--accent)`, drawn right at the tile's outer edge).
    - **Real bug found from that same hover screenshot, not just a sizing
      preference:** the name text under the hover-highlighted card looked
      like empty space, as if the border enclosed a gap below the frame
      with nothing in it. The name element was actually there and
      correctly laid out — it just inherited `.gallery-item-name`'s base
      `color: var(--card-text)` (`#1a1a1a`, near-black), a color chosen for
      a name line sitting on `.gallery-item`'s own cream background. Once
      that background was made transparent for the weapons frame (see
      above), the same dark text was rendering directly on the dark page
      background instead, at near-zero contrast, invisible rather than
      merely small. Fixed with `.gallery-item[data-kind='weapons']
      .gallery-item-name { color: var(--text); }` (`--text`, `#f0f0f0`, the
      project's normal light body-text color). **Whenever a tile/element's
      background changes from light to transparent/dark, re-check every
      text color inside it that was implicitly relying on the old light
      background for contrast — a color that was correct for a cream card
      face can be silently unreadable once that face becomes transparent
      and dark page background shows through instead.**
  - **Shields gallery gets the identical treatment to Weapons above, by
    request ("genau wie bei den Waffen") — same structure, same final
    tuning numbers (10% art shrink, 0.2rem tile padding, 7.5rem grid
    column, 0.9rem hex-box font, display-font name), just pointed at
    `images/frames/shield.png` and `.card--shield`'s own `--art-*`/
    `--hex-*` percentages (`21.6%/17%/79.4%/72%` and `41%/73.4%/60.2%/
    88.5%`) instead of the weapon frame's numbers. Implemented by
    generalizing `buildGalleryItem()`'s `kind === 'weapons'` check (both
    the `.gallery-item-art` wrapper-div step and the "nest the rank inside
    the portrait" step) into a shared `usesCardFrame` flag, and adding a
    second `.gallery-grid--shields` / `.gallery-item[data-kind='shields']`
    CSS block mirroring the weapons one rule-for-rule. Monsters got the
    same treatment right after, by the same request pattern, extending
    `usesCardFrame` to `kind === 'weapons' || kind === 'shields' || kind
    === 'monsters'` and adding a third matching `.gallery-grid--monsters` /
    `.gallery-item[data-kind='monsters']` block, pointed at
    `images/frames/monster.png` and `.card--monster`'s own `--art-*`/
    `--hex-*` percentages (`15%/14%/85%/71%` and `40.2%/75.4%/59.9%/89.3%`
    — identical to the weapon frame's own art box, since the two frames
    share the same rail/hexagon layout, see "Card frame artwork" above).
    Monsters is now the only kind with all of its ranks (23, 10-70 — the
    pool has grown since this was written, see "Monster Pool" below, vs.
    Weapons' 9 and Shields' 3) using this treatment, and it was a drop-in fit at
    that item count — nothing about the layout needed to change for the
    larger grid. **Any future kind needing this same card-frame gallery
    treatment should extend `usesCardFrame` and add one matching CSS block
    the same way** — the structural JS logic is fully shared now, only the
    frame image and the 8 `--art-*`/`--hex-*` numbers differ per kind.
  - **Bottom-edge gray bar fix (all 3 card-frame kinds):** user-reported via
    screenshot — a flat, solid-looking light-gray horizontal bar across the
    full width, right at the very bottom of every Weapon/Shield/Monster
    gallery tile (not Champions). Root cause, found by simulating the exact
    downscaled composite in Pillow (same technique used earlier for the
    champion-select frame crop) since no live screenshot tool was available
    in-session: `images/frames/weapon.png`/`shield.png`/`monster.png`/
    `potion.png` each carry a thin strip of **fully-opaque** (`alpha ==
    255`) gray/pink pixels right at their bottom edge (roughly the 93-97%
    mark down the image height, confirmed by direct per-pixel sampling —
    this is real painted content, not a transparency/alpha-blending
    artifact), most likely a sliver of the original sprite sheet's own
    drop-shadow that the crop caught as opaque frame content instead of
    trimming away. At real in-game card sizes it's subtle enough to go
    mostly unnoticed; downscaled to a small gallery tile it blurred into
    the reported flat gray bar. **Deliberately not fixed by editing the
    source PNGs or by cropping/positioning pixels away** — shields have
    rivet/corner details sitting in that same bottom band (see
    `.card--shield`'s corner icon boxes), and any pixel-row crop there
    risks cutting into those, which the user explicitly flagged as a risk
    to watch for. Fixed instead with a CSS-only dark gradient overlay, per
    the user's own suggested fix ("dunkel grau machen dass es wie ein
    Schatten aussieht, oder ganz entfernen"). Two follow-up rounds after
    the first version shipped, both found via user screenshot:
    - **Too weak, and squared off:** the first version was a plain
      `inset: 0` `::after` with a single transparent→0.7-black ramp
      spanning 91-100%. It wasn't dark enough at the halo's actual
      position (~93-97%) to fully hide it, and — worse — a plain rectangle
      doesn't know about the frame art's own rounded bottom corners
      (transparent outside that rounded silhouette), so the overlay's
      square corners visibly stuck out past the card's rounded shape as a
      flat black patch, reported as "ein eckiger schwarzer Schatten...
      passt gar nicht zur Karte." Fixed by (a) a steeper multi-stop
      gradient that reaches strong opacity right at the halo's real
      position instead of past it, and (b) `mask-image`/`-webkit-mask-
      image` pointing at the exact same frame PNG already used as that
      element's own `background-image` — `mask-image`'s default mode for
      a plain image reference is alpha-based (`mask-mode: match-source`
      resolves to `alpha`, not `luminance`, for an `<image>` source), so
      the overlay is automatically clipped to nothing everywhere the frame
      art itself is transparent, rounded corners included, with no
      separate corner-radius math needed.
    - **Too dark:** once the corners were fixed and the shadow's shape
      actually read correctly, the peak opacity (0.92) looked too heavy/
      gloomy overall. Lowered to 0.55 (`linear-gradient(to bottom,
      transparent 90%, rgba(0,0,0,0.32) 93%, rgba(0,0,0,0.55) 96%,
      rgba(0,0,0,0.55) 100%)`) — still enough to knock the halo's
      ~140-brightness gray down into blending with the frame's own dark
      border, just without the near-black look 0.92 had.
    Every iteration was verified offline first (masking the gradient by
    the source image's own alpha channel with Pillow/numpy, replicating
    exactly what `mask-image: alpha` does) and sent to the user as a
    rendered PNG before touching the CSS, then confirmed live via
    computed-style checks in the browser, since no screenshot tool was
    available in-session either time. The final gradient stops well above
    the hexagon (`--hex-bottom` is 88.5-89.3% for all 3 gallery types) so
    the value number is never dimmed, and shield rivets stay fully visible
    at every step — only ever darkened, never cropped or altered.
    **Same fix applied to real in-game cards too, by request** — all 4
    types including potion (which carries the identical halo in
    `images/frames/potion.png`, confirmed by the same per-pixel sampling).
    Implemented as `.card--monster::before`/`.card--weapon::before`/
    `.card--potion::before`/`.card--shield::before` (near the `.card--*`
    frame-background rules, style.css) with the exact same masked
    gradient — **`::before`, not `::after`, on purpose**: CLAUDE.md
    elsewhere describes a `.card--potion::after` life-pulse glow and a
    `.card--aura::after` pulsing aura as part of the strength-tier system,
    but neither rule actually exists in style.css as of this change (that
    part of the documentation is stale) — `::before` was still the
    deliberate choice regardless, so this fix stays non-conflicting if
    that pulse system is ever reintroduced, rather than fighting a future
    `::after` rule over `background`. Since `fillCardFace()` reuses the
    same `.card`/`.card--*` markup for the equipped weapon/shield slots
    too, this fix applies there automatically with no separate rule
    needed — verified live on `#shield-slot-card` after equipping.
    **If a future frame asset shows the same artifact, prefer this same
    masked-overlay approach over editing/cropping the source PNG**,
    especially for any frame with fine corner/edge details (rivets, chain
    links, etc.) near that edge — and prefer `::before` over `::after` on
    any element unless you've confirmed nothing else already uses that
    pseudo-element for something else.
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
    control. `#room` is `flex-wrap: nowrap` for this reason. **This one-row
    rule now has a single deliberate exception**, see the phone-tier 2x2
    grid bullet further down.
  - **Each `--card-scale` value is bounded by a horizontal fit constraint
    too, not just the per-tier vertical one described below.** 4 cards
    plus 3 gaps at a tier's scale must fit within that tier's minimum
    qualifying viewport **width**, or the row causes horizontal
    scrolling, exactly as unacceptable as vertical scrolling. This bit
    both the phone tier and the landscape-safety tier when `--card-scale`
    was bumped up across the board to make cards generally bigger: the
    phone-tier value had to be capped at `0.78` (not a rounder `0.8`)
    because `0.8` overflowed by a couple px at 360px width (a common
    Android baseline, e.g. Galaxy/Pixel phones — narrower than the
    375px iPhone width this project had mostly been eyeballed against),
    and the landscape-safety tier (`max-height: 480px`) had to stay at
    its original `0.45` entirely, with no headroom to increase at all,
    because even `0.46` overflowed at a 360px-tall landscape window.
    Verify both axes (`scrollWidth > clientWidth` and
    `scrollHeight > clientHeight`) at a tier's minimum width **and**
    minimum height, not just one, whenever `--card-scale` changes.
  - Every breakpoint (`--card-scale`, `--stack-gap`, and the root
    `font-size` together) requires a minimum viewport **height** as well as
    width before stepping up a tier — measured against this page's actual
    content height at that tier, with a safety margin. So a wide-but-short
    window (e.g. a 1280x720 laptop) automatically falls back to a smaller
    tier instead of overflowing. A `max-height: 480px` tier (e.g. a phone
    in landscape) is the final safety net.
  - `#message` is capped to 2 lines via `-webkit-line-clamp` so a long
    fight/flee message can never push the page taller.
  - **`#message` reserves a fixed height (`height`, not `min-height`) for
    those same 2 lines, always, even when the message is empty or one
    line.** Reported via screenshot: with `min-height` alone, this box grew
    the instant a message wrapped to its 2nd line and shrank back down the
    instant it didn't, which nudged `#flee-btn` and `#weapon-area` apart and
    back together on almost every action, one line shy of ever noticing
    it's the same box. A fixed height (`2.21rem` = `0.85rem` font-size x
    `1.3` line-height x `2` lines, `1.95rem` at the `max-height: 480px`
    tier's own smaller `0.75rem` font-size) reserves that same space
    whether the message is empty, one line, or two, so neither neighbor
    ever moves. `-webkit-box-pack: center` centers shorter/empty messages
    inside that reserved space instead of pinning them to the top with
    blank room below.
    **This raised every tier's own true minimum content height** (a real
    2-line message, not just an empty one, is now always reserved for, not
    just occasionally reached), which pushed 3 of the 4 breakpoint gates
    above right up against their content, verified by measuring with the
    message forced to 2 real lines at each tier's exact gate: the tablet
    gate moved `665px` to `715px`, small/mid desktop `900px` to `935px`,
    full desktop `1040px` to `1110px`. The phone/default tier and the
    2x2 grid tier's own `min-height: 650px` gate both already had enough
    slack and didn't need adjusting. **Any future change to `#message`'s
    reserved height, font-size, or line-height must re-measure all 4
    breakpoint gates the same way** (force a real 2-line message, check
    `document.documentElement.scrollHeight` at each gate's own exact
    minimum width/height, and just below it to confirm the fallback tier
    still fits too), not just the tier being changed, since `#message` is
    shared by every tier.
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
  - **Phone-tier 2x2 room grid (the one exception to the always-one-row
    rule above).** Reported via an iPhone SE screenshot: the base phone
    tier's `--card-scale` (`0.78`) already sits right at that tier's
    documented horizontal ceiling (see the `0.78` vs `0.8` bullet above),
    so there was no room left to grow a single-row phone layout further,
    even though a phone in portrait has a lot of unused *vertical* slack
    once cards are that small (measured at 375x667: only around 65% of
    the viewport height was actually in use). A `@media (max-width: 639px)
    and (min-height: 650px)` block (placed right after the base `#room`
    rule in `style.css`, specifically so it wins the cascade over that
    same-specificity `#room` id selector via source order) switches
    `#room` to a 2-column CSS grid at a bigger `--card-scale` (`0.9`)
    for any phone-width, portrait-ish viewport tall enough to fit two
    rows. The `min-height: 650px` gate exists so a short phone falls back
    to the normal single-row phone tier instead, which is already
    verified safe all the way down to the `max-height: 480px` net, two
    rows at the bigger scale would not fit there. `0.9` and `650px` were
    both chosen by measuring `#game-screen`'s real height at 375x667 and
    leaving a deliberate safety margin, then re-checked at 360x667, 320x568
    (falls back to single-row, as intended), and 390x844/393x852 with no
    scrolling on either axis. `#room`'s new `margin-top: 0.35rem` (the fix
    for the champion badge overlapping the top of the cards with almost no
    gap, also reported via that same screenshot) is zeroed back out inside
    the `max-height: 480px` safety block specifically, since that tier has
    zero vertical headroom to spare for it (see the `0.46` bullet above).
  - **Fixed card positions within the 2x2 grid (custom addition on top of
    the grid above).** By request: resolving a card in the 2x2 grid must
    leave that slot visibly empty rather than letting the other cards
    reflow to close the gap, and a room refill must fill the new cards
    into whichever slots are empty rather than restacking the whole room.
    Before this, `renderRoom()` (`js/ui.js`) always just tore `#room` down
    and rebuilt it straight from `state.room`'s current array order, which
    is fine for the normal single-row layout (order never mattered
    visually there) but meant every remaining card visibly jumped to a new
    position in the grid the moment any other card was resolved, and
    jumped again on the next refill. Fixed with `roomSlots`, a
    module-level array of 4 fixed positions in `js/ui.js` (empty room
    slots render as `.room-slot-empty` in `style.css`, an invisible,
    unclickable box the same size as a card, so the grid cell stays
    reserved), reconciled against the live `state.room` every render by
    `updateRoomSlots()`: any slot whose card is no longer in `state.room`
    is cleared first, then any `state.room` card not yet in a slot is
    placed into the first empty one. Tracked by object reference, not
    `card.id`, specifically so a brand new game (`initGame()` hands out
    all-new card objects every time via `getFreshDeck()`, even though the
    same id strings repeat every game, e.g. `"diamonds-30"` or
    `"monster-25-1"`) can never confuse
    a leftover slot from the previous game with a same-id card in the new
    one, nothing needs to explicitly reset `roomSlots` on New Game or Play
    Again, the reference simply won't be found in the new `state.room` and
    that slot clears itself out naturally. Only active while `#room`'s own
    computed `display` is `grid` (read directly from the DOM in
    `renderRoom()` rather than re-encoding the grid tier's media query
    breakpoint a second time in JS), so the normal single-row layout is
    completely untouched by any of this and keeps compacting the way it
    always did. `#room-empty` (the pre-first-game/post-game call to
    action) also got `grid-column: 1 / -1; grid-row: 1 / -1;` in
    `style.css` so it still spans and centers across the whole grid area
    as a single item, instead of being squeezed into just the grid's first
    cell.

## Card architecture (important — read before adding/editing cards)

- Every **weapon (melee and ranged)/potion/shield** card (25 total: 9 + 4 +
  9 + 3) is defined **individually** in `js/cards.js`'s `CARD_LIST` via its
  own `makeCard(suit, rank, overrides)` call — not generated in a loop. This
  is deliberate: it keeps each of those 25 cards independently editable/
  extendable. **Monster cards are a deliberate exception** to this, loop-
  generated from a data table instead (`getAllMonsterCards()` in
  `js/cards.js`) — see "Monster Pool" below for why that split makes sense
  (every monster instance really is interchangeable pure data, unlike a
  weapon/potion/shield card, which might later want a unique effect).
- **One file per card is intentionally NOT used** for the base weapon/potion/
  shield cards — they're pure data with no unique behavior, so one shared
  `cards.js` list is enough. Once a specific card gets a real special-ability,
  give **that card** (and only that card) its own file under `js/effects/`
  (create the folder when the first one is needed), and reference it from
  that card's `overrides` in `cards.js` (e.g. an `effectId` matched to a
  lookup, or a directly imported handler). Don't pre-create one effect file
  per card "just in case."
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
  rolled effect (any of the 9 melee weapon cards can get one — Ranged
  weapons, see "Ranged Weapons" below, are deliberately excluded), which is
  a different pattern from a specific named card having a fixed unique
  ability: for the latter (e.g. a one-of-a-kind legendary item), give
  **that card** its own file under `js/effects/` (create the folder when
  the first one is needed) and reference it from that card's `overrides`
  in `cards.js`, rather than reusing the `effect` string field.

## Monster Pool (custom addition, not part of the original Scoundrel rules)

- Unlike weapons/potions/shields, monster cards are **not** a fixed,
  individually hand-written list. Every monster rank currently listed in
  `MONSTER_NAMES` (`js/monster-icons.js`) gets exactly 2 card instances (ids
  `"monster-<rank>-1"`/`"-2"`), generated by looping over
  `getMonsterRankPool()` in `getAllMonsterCards()` (`js/cards.js`) — this is
  a deliberate exception to the "every card defined individually" rule in
  "Card architecture" above, since every monster instance really is
  interchangeable pure data (two copies of the same creature), unlike a
  weapon/potion/shield card, which might later want a unique effect.
  Currently that's 23 ranks × 2 = 46 possible monster card instances, though
  the number of ranks is meant to keep growing over time.
- **A fresh game draws a random 26 of those (`MONSTER_DECK_COUNT` in
  `js/monster-pool.js`) via `selectMonsterCardsForDeck()`**, called once from
  `getFreshDeck()` in `js/cards.js`. "Max 2 copies of any one rank" falls out
  for free, since the pool itself never holds more than 2 instances of a
  given rank to begin with. While the pool has 26 or fewer cards total (true
  up through 13 ranks), every card is used and there's no real selection to
  make; today's 23-rank pool is well past that point, so a real, meaningfully
  different subset of monsters is drawn each game.
- **The 26 drawn cards' total value must fall within
  `[MONSTER_VALUE_SUM_MIN, MONSTER_VALUE_SUM_MAX]`** (currently 940-1030,
  `js/monster-pool.js`), via rejection sampling (reshuffle the whole pool,
  take the first 26, check the sum, retry, same style as `isRoomSafe()`/
  `drawForRoom()` in `js/state.js`) — this keeps a game from randomly rolling
  a dungeon that's either suspiciously easy (mostly weak monsters) or
  unfairly hard (mostly strong ones). **This range must stay centered on the
  pool's own natural unconstrained-draw average, not just "look reasonable"
  for the pool's value spread** — it was originally tuned for a smaller pool
  and, left unchanged after the pool grew to 23 ranks, was found (by
  simulating 20000 game starts) to sit well above the new pool's natural
  average, which biased the rejection-sampling loop toward
  over-representing strong monsters (the weakest monster showed up in only
  ~47% of games, the strongest in ~67%, versus a uniform ~56-57% once
  re-centered). **Any future change to the monster pool's contents (adding,
  removing, or re-valuing monster types) changes this natural average too,
  and must be re-simulated the same way before touching these two numbers**
  — the bias above looked like a perfectly reasonable range on paper and
  still produced a real, measurable skew.
- If no attempt lands in range within `MONSTER_SELECTION_MAX_ATTEMPTS` (300,
  a generous safety net, not a value tuned to "barely" work), falls back to
  the closest-to-range candidate seen and logs a console warning, rather
  than failing outright.
- **Monster values (23 types, 10-70) are one continuous hand-tuned curve**,
  not evenly spaced: 2-wide steps for the first 6 ("trash tier", where finer
  granularity between weak monsters matters more), then a flat 3-wide step
  for the remaining 17, landing exactly on 70 for the Demon Lord, still the
  single strongest. `MONSTER_NAMES`/`MONSTER_DESCRIPTIONS`
  (`js/monster-icons.js`) are the single source of truth for which ranks
  exist — the deck pool (`getAllMonsterCards()`), the Monsters gallery
  (`renderGallery('monsters')` in `js/ui.js`), and the asset preloader all
  read from `getMonsterRankPool()` (derived from `MONSTER_NAMES.en`'s keys)
  rather than a separately hand-maintained range, so adding a new rank there
  is the only step needed to make a new monster show up everywhere. Adding a
  monster rank still needs a matching artwork file at
  `images/monsters/<rank>.png` (see "Monster artwork" below) or it falls
  back to the suit-symbol placeholder like any other card would.
- Monsters dropped the clubs/spades poker-suit framing entirely — there's
  only one `SUITS.MONSTERS` pseudo-suit now (same idea as `SUITS.SHIELDS`),
  and monster card ids look like `"monster-45-1"` rather than an old
  `"spades-9"`-style id. Any old reference to a monster card by a
  clubs/spades id (e.g. in a saved test fixture) is stale.

## Weapon Effects (custom addition, not part of the original Scoundrel rules)

- Every **melee** weapon card has a 25% chance of getting one of four
  effects, re-rolled at the start of every game — `rollWeaponEffects()` in
  `js/weapon-effects.js`, called once from `initGame()` in `js/state.js`.
  Ranged weapons (see "Ranged Weapons" below) never roll one — the check is
  gated on `card.suit === SUITS.DIAMONDS`, not just `card.type === 'weapon'`,
  specifically to exclude them.
  `WEAPON_EFFECTS` in that same file holds each effect's name/icon/
  description (used for the card's corner badge, tooltip, and
  `#weapon-status`); the actual gameplay logic lives in `fightMonster()` in
  `js/state.js` since it needs `state`.
  - **Vampiric** — heals 5 HP whenever the weapon defeats a monster (the
    ×5-rescaled equivalent of the original 1, see the "Value rescale" note
    in `js/cards.js`).
  - **Electric** — every *other* monster currently in `state.room` loses 5
    strength (via `weakenMonster()`, floor of 5, again the ×5-rescaled
    equivalent of the original 1/floor-of-1) whenever the weapon is
    used in a fight. Only `rank` (and the `label`/`name` derived from it)
    changes — `baseRank` and `image` don't, so the monster stays visually
    and nominally the same creature, just weaker.
  - **Sturdy** — `state.weaponMaxMonster` (the "can only defeat monsters
    weaker than X" ceiling) can drop by at most 10 per fight (the ×5-rescaled
    equivalent of the original 2) instead of dropping straight to the
    defeated monster's value.
  - **Fragile**: breaks after `FRAGILE_MAX_USES` (2) uses, no matter which
    monster it's used on. Tracked by `state.weaponFragileUsesRemaining`
    (`js/state.js`): set to `FRAGILE_MAX_USES` by `equipWeapon()` whenever a
    Fragile weapon is equipped (and reset the same way if it's replaced
    before breaking), then counted down by 1 in `fightMonster()` every time
    the weapon is actually used, regardless of the fight's outcome.
- Badge icons are plain letters (V/E/S/F), not emoji — an emoji shield
  (🛡) didn't render on every system/font tested, while a plain letter
  always does. Keep this in mind if adding more effects later: prefer a
  letter/simple-glyph badge over an emoji unless you've verified it
  renders broadly.
- **Fragile's durability bar and break animation.** `#weapon-fragile-bar`
  (`index.html`, styled in `style.css`) reuses the exact same
  `.ability-segment`/`.ability-segment--filled` markup/CSS as
  `#champion-ability-bar` (the Paladin/Rogue/Herbalist passive bar under the
  HP bar), full (`FRAGILE_MAX_USES` segments filled) on a fresh Fragile
  weapon, one segment drains per use. `renderWeaponFragileBar()` in
  `js/ui.js` is called from inside `renderWeaponSlot()` itself (not a
  separate call site to remember at every one of `renderWeaponSlot()`'s many
  call sites) so it can never drift out of sync with whichever weapon is
  currently equipped, and is hidden entirely for a non-Fragile weapon or no
  weapon at all. `#weapon-fragile-bar.hidden { display: none; }` has its
  own rule (this project has no shared `.hidden` utility class, see the
  comment near `#tutorial-coachmark.hidden` in `style.css`) since without it
  the bar's own explicit height would still occupy space even while "hidden".
  - **Positioned absolutely against `#weapon-slot-wrap`, not laid out below
    the card in normal flow.** `#weapon-slot-card` is wrapped in a plain
    `position: relative` `#weapon-slot-wrap` (in `index.html`, replacing the
    bare `#weapon-slot-card` inside `#equipment-slots`) specifically so the
    bar can center itself under the weapon slot on its own (`left: 50%` +
    `translateX(-50%)`) rather than under the whole shield/weapon/ability
    row, whose midpoint only lines up with the weapon slot by coincidence of
    the three slots being equal width. An earlier version laid the bar out
    as a second row inside a column-flex wrap, in normal flow underneath the
    card. That made the wrap taller than the shield slot the instant a
    Fragile weapon got equipped, and `#equipment-slots`' `align-items:
    center` then re-centered the whole (now taller) wrap, visibly nudging
    the weapon card itself up out of alignment with the shield card every
    time a Fragile weapon was equipped or unequipped. Taking the bar out of
    flow (`position: absolute; top: 100%`) fixes this at the root: the
    wrap's own in-flow height is always exactly the card's height, so the
    weapon slot never moves regardless of whether the bar is showing.
  - **The actual break is deliberately deferred until after the weapon-attack
    swing has fully returned to the slot, not applied the instant uses hit
    0.** `fightMonster()` only *reports* `weaponBroke: true` in its result
    and leaves the weapon equipped (at 0 uses); a new function,
    `breakFragileWeapon()`, is what actually unequips it (clearing
    `equippedWeapon`/`weaponMaxMonster`/`weaponFragileUsesRemaining`, the
    same three fields any other "equip something else" swap would clear).
    The reason: `animateWeaponAttack()` (`js/ui.js`) flies the *real*
    `#weapon-slot-card` element out to the monster and back over ~1.5s,
    calling `renderWeaponSlot()` mid-flight at impact (see "Fighting a
    monster with the equipped weapon..." under Interaction design decisions
    below): if the weapon were already unequipped by then, that mid-flight
    re-render would instantly swap the flying card face for the empty-slot
    icon, reading as the weapon vanishing before it's even swung back.
    `resolveAndAnimate()` in `js/main.js` captures `fightMonster()`'s result
    from the impact callback into an outer `fightResult` variable, then
    checks `fightResult.weaponBroke` in `animateWeaponAttack()`'s `onDone`
    callback (fired once the swing has fully returned and every inline
    transform/position style it used has already been cleared); only then
    does it call `breakFragileWeapon()` followed by the shatter animation.
  - **Shatter animation is shared with shields, not reimplemented.** What
    was `animateShieldShatter()` in `js/ui.js` is now a thin wrapper around a
    generalized `animateSlotShatter(slotId, onDone)`, the same pie-slice-shard
    clone-and-fly logic (see "Breaks (`shieldBroke`)" under Shields below
    for how it works), just parameterized on which slot element to clone.
    `animateWeaponShatter()` is the weapon-slot counterpart, calling the same
    helper with `'weapon-slot-card'`. The CSS classes it uses were renamed
    to match (`.shield-shatter-container`/`.shield-shard` →
    `.card-shatter-container`/`.card-shard`, keyframe `shield-shard-fly` →
    `card-shard-fly`) since they're no longer shield-specific. Any future
    equip slot that can "break" should reuse this same helper rather than
    writing another copy of the shard math.
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

## Ranged Weapons (custom addition, not part of the original Scoundrel rules)

- A second weapon category alongside the original ("Close Range") weapons,
  currently 5 bows (10/15/20/30/40 damage, named Kurzbogen/Reflexbogen/
  Jagdbogen/Kriegsbogen/Langbogen — Short/Recurve/Hunting/War/Long Bow),
  sharing the same weapon equip slot as melee weapons — equipping one
  discards whatever was equipped before, exactly like swapping to a
  different melee weapon. Uses its own pseudo-suit, `SUITS.RANGED`
  (`js/cards.js`), alongside `SUITS.DIAMONDS` (melee) — both map to
  `type: 'weapon'` via `suitToType()`, which is what lets a ranged weapon
  flow through the exact same `resolveCard()` dispatch, weapon equip slot,
  and weapon-attack swing animation as a melee weapon, while still being
  tellable apart by `card.suit` everywhere the two need different treatment
  (`fightMonster()`/`isWeaponUsableOn()`/`equipWeapon()` in `js/state.js`,
  `flavorNameFor()` in `js/ui.js`). Ranged and melee ranks currently
  overlap (both use some of the same 10/15/20/30/40 values), which is why
  ranged weapons need their own image folder
  (`images/weapons/RangedWeapons/<rank>.png`, vs. melee's
  `images/weapons/MeleeWeapons/<rank>.png` — both moved out of the old flat
  `images/weapons/<rank>.png` when this was added) and their own name/
  description table (`js/ranged-weapon-icons.js`, mirroring
  `js/weapon-icons.js`'s shape exactly) — a single table keyed only by rank
  could not have told a "10 melee" (Wooden Club) from a "10 ranged" (Short
  Bow) apart.
  - **The Recurve Bow was added later**, as a 5th bow filling the gap
    between the Short Bow and what was then the Hunting Bow — user-supplied
    artwork (`RecurveBowTransparent.png`, already background-removed,
    cropped to its own alpha bounding box with a small pad, same "already-
    transparentized PNG on an oversized canvas" step as every other weapon
    added since the checkerboard-crop pipeline was retired, see "Weapon
    artwork" below). It took over rank 15, the Hunting Bow's own value at
    the time, which is why the Hunting Bow and War Bow both moved up
    (15→20 and 25→30) rather than the new bow being squeezed in at some
    in-between, non-multiple-of-5 rank — every other rank value in this
    project (monsters aside) is a multiple of 5, and there was no reason
    for ranged weapons to be the one exception. The Long Bow (40) and Short
    Bow (10) were untouched, only sitting on either side of the shuffle.
- **Completely different damage model from melee.** A melee weapon reduces
  the damage *the player* takes (`monster rank − weapon rank`); a ranged
  weapon instead subtracts its own rank directly from the *monster's* rank
  (`fireRangedWeapon()` in `js/state.js`, called from `fightMonster()`,
  which delegates to it immediately whenever the equipped weapon is Ranged
  and legal to use — see below). If that drops the monster's rank to 0 or
  below, it's defeated outright, exactly like a melee kill. Otherwise the
  monster **survives at its new, lower rank and stays in the room** — the
  one case in this game where resolving a card doesn't remove it. Example:
  a 15-damage bow shot at a 40-value monster leaves it at rank 25, still
  sitting in its room slot, still needing to be finished off later (by
  another shot, or by a melee weapon/bare hands, using its new lower rank).
  - **This meant `resolveCard()` (`js/state.js`) could no longer
    unconditionally splice the resolved card out of `state.room` before
    dispatching to `fightMonster()`.** It now looks the card up (keeping its
    index) and only removes it once the result comes back, gated on
    `result.monsterDied !== false` — every non-ranged outcome (a melee/
    bare-handed fight, equipping something, drinking a potion) either
    doesn't set this field at all or `fightMonster()` sets it explicitly to
    `true`, so the default (`!== false`) still removes the card exactly as
    before; only `fireRangedWeapon()`'s survive case ever sets it `false`.
    Nothing else in `resolveCard()` needed to change — with the card still
    in `state.room` (4 cards, nothing removed), the win-check and the
    "refill once only 1 card is left" logic further down are natural
    no-ops on their own, so the only actual branch point is the splice
    itself.
  - **A 20% chance (`RANGED_RETALIATE_CHANCE`, `js/state.js`) of the monster
    striking back**, but *only* on a shot that doesn't kill it (a dead
    monster can't retaliate) — for the *full* value it has left **after**
    the shot's own reduction, not its original value. E.g. the 15-damage
    bow above, fired at a 40-value monster: on a normal hit nothing happens
    to the player; on the 20% roll, the player takes a hit worth the
    monster's new value, 25, same as any other incoming damage from there
    (Paladin's Blessing, then the shield block, apply to it exactly like
    they would to a melee/bare-handed hit — see `fireRangedWeapon()`, which
    shares that tail logic with `fightMonster()`).
- **The weapon degrade rule (`weaponMaxMonster`) doesn't apply to Ranged
  weapons at all** — `isWeaponUsableOn()` (`js/state.js`) short-circuits to
  `true` for any equipped Ranged weapon regardless of what it was last used
  on. Ammo (see below) is the only thing limiting reuse.
- **Ammo, not the weapon-degrade rule, is what eventually retires a ranged
  weapon.** `RANGED_AMMO_MAX` (`js/state.js`) is 3, tracked per-equip via
  `state.weaponAmmoRemaining` — set fresh whenever a Ranged weapon is
  equipped (`equipWeapon()`), decremented by 1 on every shot regardless of
  outcome (kill, survive, or retaliation), and once it hits 0 the weapon
  breaks. This mirrors the Fragile weapon effect's
  `weaponFragileUsesRemaining` counter almost exactly (same "count down
  every use, break at 0, deferred until the attack swing has fully
  returned to the slot before actually unequipping" pattern, see
  `breakEquippedWeapon()`) — which is why that function (originally
  `breakFragileWeapon()`) was generalized to clear *both* counters, rather
  than adding a second, near-identical "break the weapon" function. A
  weapon is never both Fragile and Ranged at once: `rollWeaponEffects()`
  (`js/weapon-effects.js`) is gated on `card.suit === SUITS.DIAMONDS`, not
  just `card.type === 'weapon'`, specifically to exclude Ranged weapons —
  Vampiric/Electric/Sturdy assume the melee damage-reduction formula, and
  Fragile's own break-after-N-uses would collide with ammo's separate
  break condition, so Ranged weapons simply never roll an effect
  (`card.effect` stays `null`).
  - **The ammo bar reuses the exact same UI as Fragile's durability bar**
    (`#weapon-fragile-bar`, one `.ability-segment`/`.ability-segment--
    filled` per remaining use/shot — see "Fragile's durability bar and
    break animation" under Weapon Effects above) — the function that fills
    it was generalized from `renderWeaponFragileBar()` to
    `renderWeaponUsesBar()` (`js/ui.js`) to cover both cases (never both at
    once, per the paragraph above), reading whichever counter/max applies.
    The DOM id itself was deliberately left as `#weapon-fragile-bar` (not
    renamed) — it's an implementation detail no other code depends on the
    name of, and renaming it would only have touched HTML/CSS for no
    functional benefit.
  - `#weapon-status` shows a dedicated line for a Ranged weapon (`"No
    degrade limit, N / 3 arrows left"`, `rangedWeaponStatus` in
    `js/i18n.js`) instead of the melee branch's degrade-restriction/weapon-
    effect text, in `renderWeaponSlot()` (`js/ui.js`).
- **No corner badge on the card itself.** An earlier version showed a small
  arrow icon (`images/symbols/ArrowSymbolTransparent.png`, user-supplied,
  source kept as `ArrowSymbol.png`) in the same corner-badge slot a rolled
  weapon effect uses (`.card-effect-badge`), as an at-a-glance "this is a
  ranged weapon" cue. Removed by request, `fillCardFace()` (`js/ui.js`) now
  shows nothing extra on a Ranged weapon's card, on either its room card or
  the equipped weapon slot, the ammo bar under the weapon slot (see below)
  is the only visual cue left. The icon asset itself is untouched on disk
  (unused, not deleted) in case a future spot for it comes up.
- **Hit feedback on the monster's own card, not the player's.** A shot that
  doesn't kill plays a floating "-N" + `.card--shake` directly on the
  target's still-live card element (`applyResolve()` in `js/main.js`,
  guarded on `result.shotDamage` — only ever set when `monsterDied` is
  `false`) — the same feedback pattern the Electric weapon effect already
  used for the *other* monsters it weakens, just applied to the one card
  actually being fired at. A retaliation hit, by contrast, needs no special
  UI wiring at all: it's just a normal `state.hp` change, so the existing
  generic before/after HP-delta comparison in `js/main.js` already animates
  it, exactly like every other source of damage/healing in the game.
- **Its own draw-back/loose-shot swing animation, not a reuse of melee's.**
  `animateRangedAttack()` (`js/ui.js`) is a dedicated ranged counterpart to
  `animateWeaponAttack()` (see "Interaction design decisions" below) —
  `resolveAndAnimate()` (`js/main.js`) picks between the two purely on
  `state.equippedWeapon.suit === SUITS.RANGED`, and both share the exact
  same `onImpact`/`onDone` two-callback contract and `{ speedUp }`
  controller shape, so nothing downstream of either needs to know which one
  is playing. It animates the real `#weapon-slot-card` element itself, same
  as melee (never a clone), in four legs instead of melee's three: **(1)**
  draw back a little, in the OPPOSITE direction from the shot (like pulling
  a bowstring taut, `RANGED_ATTACK_DRAW_FRACTION` = 22% of the full
  slot-to-target distance, reversed), **(2)** loose the shot at the monster,
  at twice the speed (half the duration) of melee's own out leg
  (`RANGED_ATTACK_OUT_MS` = `WEAPON_ATTACK_OUT_MS / 2`) — this is the only
  leg whose timing actually differs from melee, **(3)** a brief impact
  pause, and **(4)** swing back into the weapon slot at the exact same
  speed a melee swing returns at (`WEAPON_ATTACK_RETURN_MS`, reused
  unchanged), all per explicit request ("nur doppelt so schnell [beim
  Schuss], aber in der selben normalen Geschwindigkeit wieder zurück").
  Also branches at impact on `fightResult.monsterDied === false`: instead
  of adding `.card--resolved` and fading the card out on a timer (the
  melee/kill path), it just re-renders the room immediately, since a
  surviving monster's card isn't going anywhere. `renderGameOverBanner()`
  is still called on that path too, a retaliation hit can be lethal on its
  own.
- **Not a rarer/random deck inclusion — the 5 bows are meant to be picked
  by the player.** This is why every card already carries a `deckCost`
  field (`js/cards.js`) — see "Weapon Deckbuilder" below for the screen
  that actually reads it now (up to 10 weapon cards, out of the full
  melee+ranged catalog, capped by a total value budget of 270). It
  defaults to `rank` (a melee weapon's budget cost is just its combat
  strength, 1:1), but Ranged weapons override it to roughly half their
  face-value damage (10→5, 15→8, 20→10, 30→15, 40→20) — a melee weapon keeps
  delivering value across many fights until it degrades past usefulness,
  while a Ranged weapon only ever gets `RANGED_AMMO_MAX` (3) total uses, so
  its face-value damage number alone would overstate how much of the
  budget it deserves to cost.
- **The Weapons gallery is split into two headed sections, not two separate
  gallery buttons.** `renderGallery('weapons')` (`js/ui.js`) still fills
  the one `#gallery-grid`, just with a full-width
  `buildGallerySectionHeading()` label (`.gallery-section-heading`, spans
  every column the same way `#room-empty` spans the 2x2 room grid) in front
  of each category — "Close Range" (the existing melee loop, now reading
  `images/weapons/MeleeWeapons/`) then "Ranged" (a new loop over
  `getRangedWeaponRankPool()`, `js/ranged-weapon-icons.js` — same
  "derive from the name table's own keys, not a separately hand-maintained
  range" pattern as `getMonsterRankPool()`). Ranged tiles use their own
  `data-kind='rangedWeapons'` (not `'weapons'`) so the detail popup
  (`renderGalleryDetail()`) can look up the right name/description table
  and so a same-rank melee/ranged pair never collide — but they reuse the
  melee weapon frame's exact CSS wholesale (same `.card--weapon` frame,
  same `--art-*`/`--hex-*` box percentages, both `type: 'weapon'`), via
  `, .gallery-item[data-kind='rangedWeapons']` added alongside every
  `.gallery-item[data-kind='weapons']` selector in `style.css` rather than
  a duplicated block. The detail popup's description also appends an
  ammo-count sentence (`rangedAmmoSentence`, `js/i18n.js`) that the melee
  branch doesn't have.

- A third equippable item type on top of weapons/potions: 3 cards, ranks
  15-25 (the ×5-rescaled equivalent of the original 3-5, see the "Value
  rescale" note in `js/cards.js`), added on top of the standard 44-card deck
  (`makeCard(SUITS.SHIELDS, ...)` in `js/cards.js`) — see "Game Rules" above
  for the current per-game card-count breakdown (varies with the player's
  Deckbuilder loadout, see "Weapon Deckbuilder" below, unlike shields and
  potions which are always included in full). Shields use
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
  shield can absorb. E.g. a 15-block shield against a 25-damage hit that a
  weapon already reduced to 10 blocks all 10 (shield drops to 5 durability,
  player takes 0); the same shield against a full 25-damage bare-handed hit
  blocks 15 and shatters, player still takes the remaining 10.
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
- **No separate "damaged" artwork anymore.** An earlier version swapped an
  equipped shield's artwork to a second, cracked image
  (`shieldDamagedImageFor(baseRank)` in `js/shield-icons.js`, pointing at
  `images/shields/<rank>-damaged.png`) once `rank` dropped below `baseRank`
  but before it broke. Removed when the shield artwork was replaced with
  new single-image-per-rank renders (see "Shield artwork" below) — there's
  only one image per shield now, so a damaged shield just shows its normal
  artwork with its current (lower) rank number, same as a weakened monster
  does (`weakenMonster()` in `js/state.js`). `renderShieldSlot()` in
  `js/ui.js` now always passes the real shield object straight to
  `fillCardFace()`, no damaged-image branch. If a "visibly damaged" look is
  ever wanted again, it needs a new art asset per rank (or a CSS-only
  effect, e.g. a crack overlay) rather than assuming this old swap
  mechanism still exists.
- The Shields gallery (`shields-btn` on `#start-screen`, sits between
  Weapons and Monsters) follows the same `renderGallery()`/
  `renderGalleryDetail()` pattern as Weapons/Monsters, with one deliberate
  difference: its detail popup's strength line reads **"Block N"**, not
  "Strength N" — a shield's number is a block/durability value, not an
  attack or heal amount, so labeling it "Strength" would be misleading.
  Keep that distinction if shields ever get more display surfaces.

## Mage Staffs (custom addition, not part of the original Scoundrel rules)

- A third weapon category, alongside melee (`SUITS.DIAMONDS`) and Ranged
  (`SUITS.RANGED`, see "Ranged Weapons" above): 8 staffs/scepters, damage
  30-60, its own pseudo-suit `SUITS.MAGE`. Shares the exact same "subtract
  the weapon's rank directly from the monster's rank, kill outright at 0 or
  below, otherwise survive weakened and stay in the room, with a
  `MAGE_RETALIATE_CHANCE` (20%, `js/state.js`) chance of a non-lethal shot
  getting struck back at for whatever rank the monster has left" damage
  model as Ranged (`fireMageWeapon()` mirrors `fireRangedWeapon()` almost
  line for line), and also ignores the weapon degrade rule entirely
  (`isWeaponUsableOn()`). The one real mechanical difference: instead of a
  hard `RANGED_AMMO_MAX` (3) shot cap that eventually breaks the weapon,
  every shot costs `MAGE_MANA_COST` (1) mana from the exact SAME
  `state.mana` pool the champion's active ability spends from
  (`js/ability-icons.js`'s `ABILITY_MANA_COST`) — and a Mage Staff never
  breaks, no matter how many times it's fired. `isWeaponUsableOn()` reflects
  this by returning `state.mana >= MAGE_MANA_COST` for an equipped Mage
  Staff (rather than the usual degrade check), which is also the ONE case
  in the whole game where whether an already-equipped weapon counts as
  "usable" can change without it ever being re-equipped, broken, or
  swapped — simply from mana ticking up or down.
- **This makes a Mage Staff strictly more reusable than a bow (no ammo
  ceiling, never breaks) but self-limiting through a real opportunity cost
  instead**: every shot delays the champion's own active ability, since
  both draw from the same banked mana. `renderWeaponSlot()` (`js/ui.js`)
  reflects this with its own status line (`mageWeaponStatus`/
  `mageWeaponStatusNoMana` in `js/i18n.js`) and, whenever there currently
  isn't enough mana banked to fire, a light, separate grayscale
  (`.weapon-slot-no-mana` in `style.css`, deliberately NOT the same class
  `.weapon-slot-inactive` uses for the "Using weapon" toggle being off —
  the two mean different things and can both apply at once). With no mana
  available, `isWeaponUsableOn()` returning false makes `fightMonster()`
  fall through to a normal bare-handed fight automatically, exactly the
  way a degraded melee weapon or an empty-handed player already would —
  no special-case needed there.
- **deckCost is priced as an ascending fraction of raw damage** (0.70x for
  the weakest staff up to 0.90x for the strongest, rounded — see the
  `CARD_LIST` entries in `js/cards.js` for the exact per-rank numbers),
  deliberately different from both melee's flat 1:1 and Ranged's flat
  ~0.5x. A Mage Staff is closer to melee in how much value it delivers
  over a full run (no hard ammo ceiling), so it's priced closer to melee,
  but the opportunity cost against the champion's ability keeps it a
  little under 1:1 even at the top end. `DECKBUILDER_BUDGET` (270, see
  "Weapon Deckbuilder" below) was deliberately left unchanged when Mage
  Staffs were added — the default loadout is still all 9 melee weapons, so
  the budget's own "sits exactly at cap" property is untouched; bringing a
  Mage Staff into a loadout now genuinely requires swapping something else
  out, same as a bow always has.
- **Own image folder and name/description table**, same reasoning as
  Ranged: `images/weapons/MageWeapons/<rank>.png` and
  `js/mage-weapon-icons.js` (`MAGE_WEAPON_NAMES`/`MAGE_WEAPON_DESCRIPTIONS`/
  `mageWeaponNameFor()`/`mageWeaponDescriptionFor()`/
  `getMageWeaponRankPool()`, mirroring `js/ranged-weapon-icons.js`'s shape
  exactly) — Mage Staff ranks (30-60) overlap some melee ranks (30/45), so
  a shared table keyed only by rank couldn't tell a "30 melee" (Battle Axe)
  from a "30 mage" (Apprentice Wand) apart. The 8, in order: Apprentice
  Wand, Old Mage Staff, Hex Wand, Battle Staff, Crystal Staff, Dark
  Scepter, Arch Mage Scepter, Arcane Staff (Lehrlingsstab, Alter
  Magierstab, Hexenstab, Kampfstab, Kristallstab, Dunkles Zepter,
  Erzmagier-Zepter, Arkanstab in German). Never rolls a Vampiric/Electric/
  Sturdy/Fragile effect — `rollWeaponEffects()` (`js/weapon-effects.js`) is
  gated on `card.suit === SUITS.DIAMONDS`, same exclusion Ranged already
  relied on.
  - **Artwork source note:** the 8 renders arrived already user-background-
    -removed (transparent PNGs, no checkerboard reconstruction needed) but
    each consistently pointed toward roughly 2 o'clock instead of the
    project's usual "tip upper-right, handle lower-left" ~45° convention
    other weapon art uses. Rather than re-generating the source art, each
    was rotated in place: the true current angle of each staff was
    measured (not eyeballed) via PCA on the image's own alpha-channel
    pixel mass (`numpy`/`scipy`, largest eigenvector of the pixel
    coordinate covariance = the staff's long axis), then rotated by the
    exact delta to the target angle and re-cropped to the new alpha
    bounding box. Landed on a final ~60° angle (steeper than the usual
    ~45°, i.e. more upright/vertical) after two rounds of feedback — first
    a plain 45°-equivalent target, reported as "still not enough,
    rotate further left", then explicitly requested as "halfway between
    the current angle and 12 o'clock" (a measured ~30° average at the
    time, so target = (30 + 90) / 2 = 60°) — measuring the actual starting
    angle first, rather than assuming a nominal 45°, is what made hitting
    that "halfway to 12 o'clock" instruction exact rather than a guess.
- **The Deckbuilder pool gets a third headed section**, "Mage Staffs"
  (`galleryHeadingMageWeapons` in `js/i18n.js`), right after "Ranged" —
  `renderDeckbuilder()` (`js/ui.js`) filters `getAllWeaponCards()` a third
  time on `card.suit === SUITS.MAGE`, same `buildGallerySectionHeading()`
  pattern as the other two categories. Tiles reuse the exact same
  `.card--weapon` frame/box percentages as melee and Ranged (all three are
  `type: 'weapon'`) under their own `'mageWeapons'` gallery-item kind
  (`buildGalleryItem()`'s `usesCardFrame` flag, and the matching
  `.gallery-item[data-kind='mageWeapons']` CSS block mirroring every
  `[data-kind='rangedWeapons']` rule in `style.css`, including the bottom-
  edge halo-fix mask), so a Mage Staff tile looks identical in style to a
  melee/ranged one, just with its own frame/description text.
- **Attack animation — "Static Cast".** Unlike melee (`animateWeaponAttack()`)
  or Ranged (`animateRangedAttack()`), a Mage Staff never leaves the weapon
  slot to swing — the weapon "casts from where it stands", so
  `animateMageAttack()` (`js/ui.js`) never touches the slot's position at
  all, only a brief glow pulse (`.weapon-slot-casting`, colored with the
  same `--mana-rgb` blue the mana ring itself uses, tying the visual back
  to the resource actually being spent) plays on it while the spell
  "charges" (`MAGE_ATTACK_CHARGE_MS`, 350ms). The actual impact
  (`animateMageCastImpact()`) plays entirely on the TARGET instead: a
  rune-glow ring (also `--mana-rgb` blue — "this was a spell") flashes
  over the monster's card, a scatter of 6-8 small `-` spark particles
  bursts outward from its center (`.mage-cast-particle`, colored
  `var(--danger)` red — "and it hurt", the damage-colored counterpart to
  `showAbilityHealBurst()`'s heal-colored `+` marks, same scattered-timing-
  and-fade pattern reused wholesale), and the card gets the usual
  `.card--shake` wobble. This was chosen over two other considered
  directions (a bolt/projectile flying from the staff to the monster, or a
  beam element stretched between the two) specifically because it needed
  no new travel-distance/flight-path math at all, reusing the project's
  established `{ onImpact, onDone }` / `{ speedUp }` controller contract
  (see "Interaction design decisions" below) with the simplest possible
  internal shape: a charge pause, the impact, a short settle pause.
  - **Positioned via `getBoundingClientRect()` + `position: fixed` on
    `<body>`, not as children of the target card element** — same
    reasoning as `showCardDamage()`'s existing card-float numbers: a Mage
    Staff shot that survives has `resolveAndAnimate()` (`js/main.js`) call
    `renderRoom()` almost immediately after impact, replacing every room
    card's DOM element well before these effects finish playing, so
    anchoring to the card itself would cut them short. The shake, by
    contrast, IS applied directly to the target element — safe for the
    same short window `applyResolve()`'s own generic `shotDamage`-driven
    shake already relies on for Ranged weapons, and harmless to double up
    with it on a surviving hit.
  - `main.js`'s `attackAnimator` selection now branches three ways
    (melee / `SUITS.RANGED` / `SUITS.MAGE`) instead of the old binary
    ranged-or-not check — any future fourth weapon category needing its
    own attack animation should extend that same branch rather than
    reusing an existing one "temporarily", the way Mage Staffs briefly did
    with `animateRangedAttack()` before this animation was built.

## Weapon Deckbuilder (custom addition, not part of the original Scoundrel
rules)

- The "planned weapon Deckbuilder" the "Ranged Weapons" section above used
  to describe as not yet built is now implemented in `js/deckbuilder.js`
  (state/rules, no DOM code, same discipline as `js/state.js`) and
  `renderDeckbuilder()`/`buildDeckbuilderWeaponTile()` in `js/ui.js` (the
  UI). **It replaces the old Weapons gallery entirely** — the start
  screen's nav button (`weapons-btn`, unchanged position and `id`, but
  relabeled from "Weapons" to **"Weapon Deck"** / "Waffendeck" — see
  `weapons` in `js/i18n.js` — specifically so the label itself signals the
  deck can be adjusted here, not just viewed, per explicit request) now
  opens `openDeckbuilder()` instead of `openGallery('weapons')`, per an
  explicit request ("Es soll der neue Weapons Menü button sein, gallerie
  wird also durch den deck builder ersetzt"). `renderGallery()`/
  `renderGalleryDetail()` (`js/ui.js`) no longer have a
  `'weapons'`/`'rangedWeapons'` branch — that flow (open a read-only
  detail popup on click) doesn't fit the Deckbuilder's own click behavior
  (select/deselect), so it was removed rather than left dead;
  `weaponDescriptionFor()`/`rangedWeaponDescriptionFor()`'s flavor text
  didn't disappear, though — see "Card flip (description back face)"
  below for where it's shown now.
- **Two limits, both enforced independently:** `DECKBUILDER_MAX_SLOTS`
  (`js/deckbuilder.js`, currently 10 — "jetzt werden es 10", i.e. this
  number specifically, not a permanent ceiling, so it's kept as one plain
  easy-to-raise constant) caps how many weapon cards the loadout can hold;
  `DECKBUILDER_BUDGET` caps the sum of their `deckCost` (`js/cards.js`).
  `canSelectDeckbuilderWeapon(card)` checks slots first, then budget, and
  both checks apply regardless of the other — going over budget blocks a
  pick even with an empty slot still available, per explicit request
  ("auch wenn es noch einen Slot gäbe der offen wäre, geht ja nicht weil
  der max Wert nicht überschritten werden darf").
  - **`DECKBUILDER_BUDGET` is 270, not the 300 this section's plan
    originally proposed** (before anyone had actually added up what the
    melee set costs) — 270 is deliberately exactly the 9 melee weapons'
    own deckCost sum (10+15+...+50), found to be the correct total only
    after the first implementation pass (a doc comment had incorrectly
    assumed it summed to 300). Picking the *actual* melee sum as the
    budget, rather than a rounder number above it, is what makes the
    default all-melee loadout sit exactly AT the cap (not comfortably
    under it) even with a slot still free — swapping in a bow genuinely
    requires removing something first, the budget can't just be padded
    out for free using the one open slot. (With the original 300, and
    today's 13-card catalog summing to 316 total, even the 10 priciest
    cards only added up to 293 — the budget could never actually be the
    constraint that blocks a pick, `DECKBUILDER_MAX_SLOTS` always won
    first. 270 fixes that for the current catalog; re-check this same
    arithmetic — total catalog deckCost vs. this budget — if the catalog
    ever grows, so this cap doesn't quietly go dormant again.)
- **Default loadout (`DECKBUILDER_DEFAULT_IDS`):** all 9 melee weapons, no
  bows — deckCost sums to exactly `DECKBUILDER_BUDGET` (9 slots used, 1
  slot but 0 points under the two caps), reproducing the pre-Deckbuilder
  game's feel (every melee weapon always in the deck) as the starting
  point. This selection is plain module-level state in
  `js/deckbuilder.js` (`deckbuilderState.selectedIds`), not part of
  `state` in `js/state.js` — it's a meta-choice made before a game exists,
  the same way champion-select's choice is just an argument to
  `initGame()` rather than something read off `state`. Unlike a champion
  pick, though, it persists across games (nothing resets it), since it's
  meant to be a standing loadout, not a per-run choice.
- **A plain compacted list, not a fixed-position slot map.** Unlike the
  in-room 2x2 grid's `roomSlots` (see "Fixed card positions within the 2x2
  grid" above), `deckbuilderState.selectedIds`'s order is just selection
  order — removing one shifts every later id down to fill the gap, rather
  than leaving that slot empty and everything else pinned in place. There
  was no equivalent "don't let other cards reflow" request here, and
  reference-based tracking like `roomSlots` uses would add real complexity
  (the Deckbuilder's cards are the *shared, catalog* card objects straight
  from `CARD_LIST`, not fresh per-game instances, so there's no risk of
  the id-collision-across-games problem `roomSlots` was built to avoid in
  the first place) for no requested benefit, so it was kept as the
  simplest thing that works.
- **Selecting/deselecting:** clicking a tile in the pool below the slots
  (`#deckbuilder-pool`, delegated click listener in `js/main.js`) calls
  `selectDeckbuilderWeapon(cardId)`; clicking a filled tile in the loadout
  row above (`#deckbuilder-slots`) calls `deselectDeckbuilderWeapon(cardId)`
  and always succeeds (there's no limit on removing, only adding).
  `renderDeckbuilder()` is a full re-render after either — simple and
  cheap enough at this scale (13 weapon cards, tops) rather than patching
  individual tiles in and out. Both grids share the exact same tile
  markup: `buildDeckbuilderWeaponTile(card)` calls `buildGalleryItem()`
  (`js/ui.js`) with `kind: 'weapons'`/`'rangedWeapons'` — the very same
  illustrated-card-frame tile the old Weapons gallery used (see "Weapons
  gallery reuses the real in-game weapon card frame" above) — so a tile
  looks identical whether it's sitting in a loadout slot or the pool,
  `dataset.cardId` (a new field on top of `buildGalleryItem()`'s existing
  `dataset.kind`/`dataset.key`) is what the click handlers key off, since
  a plain rank number alone can't distinguish a melee card from a
  same-rank ranged one the way the real card id can.
- **The deckCost badge** (`buildGalleryItem()`'s new `cost` param,
  rendered by `.gallery-item-cost` in `style.css`) went through several
  full redesigns before landing on its current, deliberately shapeless
  look: a plain gold number (`var(--accent)`), centered horizontally at
  the very top of the tile (`top: 3%; left: 50%` + `translateX(-50%)`),
  outlined with a hard 4-direction black `text-shadow` (plus a soft drop
  shadow behind that) for legibility against whatever art is behind it —
  no circle, hexagon, or fill of any kind. Two earlier, fully shaped
  versions were tried and explicitly rejected in turn: first a small
  circular badge styled after `.card-effect-badge` (a rolled weapon
  effect's own corner badge on a real in-game card, see "Weapon Effects"
  above) — same dark translucent fill, same corner position — which never
  read well no matter how its color/size/border were tuned ("ich finde die
  Werte Zahl oben links sieht nicht schön aus, auch mit dem Kreis als
  Hintergrund sieht es nicht gut aus"); then a small gold hexagon echoing
  the frame's own strength hexagon further down, rejected outright too
  ("das passt nicht dazu"). Landed on the current plain-text-with-outline
  look after being asked directly for design alternatives, then moved from
  its first position (near the top-left corner icon, chosen to avoid
  overlapping it) to dead-center at the very top on a direct follow-up
  ("Platziere die Zahl bitte genau mittig oben"). Deliberately separate
  from the strength number already shown in the frame's hexagon lower down
  (`.gallery-item-rank`, bottom-center) — for a ranged weapon the two
  numbers differ (e.g. the Long Bow shows strength 40 in the hexagon, cost
  20 up top), so they need to read as two distinct things in two distinct
  spots, not the same number shown twice in one place. Only ever passed
  for Deckbuilder tiles — the badge stays entirely unused everywhere else
  `buildGalleryItem()` is called
  (Monsters/Shields/Champions galleries), since `cost` there is just
  `undefined`.
- **Wiggle feedback when a pick is blocked.** `triggerDeckbuilderWiggle(el)`
  (`js/ui.js`) reuses the exact same `card-shake` keyframe `.card--shake`
  already uses elsewhere (see "Rogue's Backstab targeting mode" above for
  the sibling continuous-wiggle version), just under its own
  `.deckbuilder-item--wiggle` class since it's applied to a plain
  `.gallery-item` tile or a `#deckbuilder-stats` `<span>`, never a
  `.card`. Same remove-then-re-add-with-a-forced-reflow gotcha as
  `animateShieldShake()` — needed so back-to-back blocked clicks each
  restart the animation instead of silently no-op-ing on an
  already-present class. Two things wiggle together, per the original
  request: the clicked pool tile itself (either limit), and whichever stat
  line (`#deckbuilder-slot-count` for `reason: 'slots'`,
  `#deckbuilder-budget` for `reason: 'budget'`) actually blocked it, so
  it's clear which cap was hit. Independently, `renderDeckbuilder()` also
  gives whichever stat is currently AT its cap a standing
  `.deckbuilder-stat--full` accent-color highlight (same "this is the
  active/limiting one" treatment as `.lang-btn--active`) — a quiet, always
  -visible hint for why the next click might wiggle, on top of the
  click-time wiggle itself.
- **Reaching a real game:** `getFreshDeck()` (`js/cards.js`) no longer
  unconditionally includes every `CARD_LIST` weapon card — it now takes
  every non-weapon `CARD_LIST` card (potions, shields) unconditionally,
  plus `getSelectedWeaponCardsForDeck()`'s cards (the Deckbuilder's
  current selection, resolved from ids back to full card objects via
  `getCardById()`), plus the usual freshly-drawn 26 monster cards. Nothing
  else needed to change: `rollWeaponEffects()` still only rolls an effect
  for `SUITS.DIAMONDS` cards regardless of how many are actually in the
  deck, and the "safe start"/monster-value-sum logic in `js/state.js`
  never assumed a fixed deck size to begin with.
- **Layout:** `#deckbuilder-overlay`/`#deckbuilder-panel`/
  `#deckbuilder-close-btn`/`#deckbuilder-title` reuse the exact same
  shared chrome as `#menu-overlay`/`#gallery-overlay`/
  `#champion-select-overlay`/`#options-overlay` (dimmed backdrop, panel,
  close button, title — see the shared selectors in `style.css`), just
  added to those same selector groups rather than duplicated, same pattern
  every other overlay in this project already follows.
  `#deckbuilder-panel` gets its own, wider fixed width (42rem, wider than
  champion-select's 38rem) since it has to fit both the loadout slots and
  the whole weapon pool stacked in one panel. `#deckbuilder-slots`/
  `#deckbuilder-pool` reuse the exact grid-column sizing the old
  `#gallery-grid.gallery-grid--weapons` rule used (now removed, since
  nothing sets that class on `#gallery-grid` anymore) — `.gallery-item
  [data-kind='weapons']`/`[data-kind='rangedWeapons']`'s own tile styling
  is an attribute selector, not scoped to `#gallery-grid`, so it already
  applies to these two new containers automatically with no changes
  needed there. `.deckbuilder-slot-empty` (an empty loadout slot) matches
  a weapon tile's own portrait aspect ratio (100 / 140) so a row of mixed
  filled/empty slots lines up evenly, same dashed-outline look as every
  other empty equip slot in the game (`.weapon-slot-empty`/
  `.shield-slot-empty`).

### Monster artwork

- `images/monsters/<rank>.png` (currently 23 ranks, 10-70, one file per
  rank — see "Monster Pool" above; both card instances of a given rank
  share the same image) are transparent-background full-color renders,
  assigned automatically in `makeCard()` in `js/cards.js`. **Superseded
  numbers, kept for historical/technique reference only:** the specific
  rank-to-creature mapping in this paragraph (2 → Slime, 3 → Skeleton, etc.)
  reflects the original 13-creature naming session and predates both the
  ×5 value rescale and a later re-curving of all 23 ranks onto a new
  non-uniform ladder (see "Value rescale" in `js/cards.js` and "Monster
  Pool" above) — `MONSTER_NAMES`/`MONSTER_DESCRIPTIONS`
  (`js/monster-icons.js`) is the current, authoritative rank-to-name
  mapping, not this paragraph. 10 more creature types were added later
  (Giant Rat, Cave Bat, Highwayman, Orc Grunt, Cursed Hound, Ghoul, Fallen
  Knight, Wraith, Ogre, Vampire Lord), each with its own individually
  user-supplied source render under `images/monsters/` (e.g. `GiantRat.jpeg`
  / `GiantRatTransparent.png`, following the same already-transparentized,
  crop-to-alpha-bbox pipeline described in the "Superseded" weapon/shield
  artwork notes further below), mapped in `MONSTER_NAMES` rather than
  documented rank-by-rank here. **Replaced entirely** from an earlier shared
  sprite-sheet crop (black silhouette PNGs cut from one
  `images/MonstersIcons.jpeg` sheet) with 13 individually user-supplied
  renders, one per rank at the time, kept as
  source reference: `images/monsters/Slime.jpeg` → 2, `Skeleton.jpeg` → 3,
  `Wolf.jpeg` → 4, `SkeletonWarrior.jpeg` → 5 (Armored Skeleton),
  `Gargoyle.jpeg` → 6, `ShadowAssassin.jpeg` → 7, `FireElemental.jpeg` → 8,
  `Minotaur.jpeg` → 9, `NatureGolem.jpeg` → 10 (Golem), `LichKing.jpeg` → 11
  (The Lich), `BroodMother.jpeg` → 12, `Dragon.jpeg` → 13, and
  `DemonLord.jpeg` → 14 (ranks at the time, now 10/14/18/22/28/34/40/46/52/
  58/64/67/70 respectively) — this last slot's name was also changed from
  "Cthulhu" to "Demon Lord" ("Dämonenfürst") in `MONSTER_NAMES`/
  `MONSTER_DESCRIPTIONS` (`js/monster-icons.js`) to match the new artwork,
  since a Lovecraftian description no longer fit a demonic-knight portrait.
  This mapping was given directly by the user, not inferred from filenames.
  The earlier "known mismatch" issue from the old shared sprite sheet (two
  printed labels not matching their artwork) no longer applies now that
  every rank has its own individually-named, individually-supplied file —
  there's no shared sheet left to mislabel.
- **Same background-removal/crop pipeline as the weapon and shield art**
  (see "Weapon artwork"/"Shield artwork" below): the user pre-flattened
  each render's own background to transparency before handing it over (an
  RGBA PNG per monster, not a checkerboard-JPEG this time), so no
  color-threshold alpha reconstruction was needed here. The only cleanup
  step actually needed was a **tight crop to each image's own alpha
  bounding box** (plus a small ~12px pad) before saving as `<rank>.png` —
  every supplied file arrived on a shared, uniform 500x500 canvas, and
  several of them (most visibly Slime and Skeleton, whose poses are much
  wider-short or taller-thin than a square) left a lot of that canvas
  empty around the actual creature. Left uncropped, `object-fit: contain`
  sizes against the **full canvas**, not the creature's own silhouette, so
  a mostly-empty canvas renders the creature far smaller inside the card's
  `--art-*` box than a tightly-cropped one would — this is the same root
  cause documented under "Shields are much smaller than weapons" further
  down, just caught here before it shipped rather than after a user report
  (checked here specifically because that shield incident was fresh).
  Verified defect-free the same way as the weapon/shield crops: an
  automated "thick mid-alpha blob" scan (zero hits across all 13) plus a
  manual composite check against both the dark in-game background and the
  light card/gallery background, focusing on the most detailed silhouettes
  (Dragon, Gargoyle, NatureGolem) where a stray fragment would be most
  likely.
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

- `images/potions/<rank>.png` (10-50 in steps of 5, one file per rank — a
  plain ×5 rescale of the original 2-10, see "Value rescale" in
  `js/cards.js`) came from a
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

- `images/weapons/<rank>.png` (10-50 in steps of 5, one file per rank — a
  plain ×5 rescale of the original 2-10, see "Value rescale" in
  `js/cards.js`; the source-reference filenames below predate the rescale
  and are still named by their original 2-10 rank) originally came from
  a user-supplied sheet (`images/WeaponsIcons.jpeg`), replaced entirely by 9
  individually user-supplied renders, one per rank, kept as source
  reference: `images/weapons/WoodenClub.jpeg` → rank 2 (now 10),
  `DamagedSword.jpeg` → rank 3 (now 15), `Spear.jpeg` → rank 4 (now 20),
  `Sword.jpeg` → rank 5 (now 25), `BattleAxe.jpeg` → rank 6 (now 30),
  `FlamingBroadSword.jpeg` → rank 7 (now 35), `DarkScythe.jpeg` → rank 8
  (now 40), `Jonathan.jpeg` → rank 9 (now 45) (Mjölnir — the file is just
  named after whoever/whatever generated it, the artwork itself is a
  lightning-wreathed hammer, matching the name), and `Excalibur.jpeg` →
  rank 10 (now 50). Names are in `WEAPON_NAMES` in
  `js/weapon-icons.js`.
- **Same source format and crop technique as the shield renders** (see
  "Shield artwork" above): each is a single subject on its own canvas with a
  checkerboard "transparency" pattern baked into the actual JPEG pixels
  (two reference colors read straight off a background-only image row),
  not a real alpha channel. This batch's checkerboard wasn't uniform across
  images the way the shields' was, though — some renders use a light
  gray/white checker, others a darker gray one, so the two reference colors
  are always re-derived per image rather than hardcoded once.
  - **A third gotcha beyond the two already documented for shields (naive
    per-pixel thresholding leaving a hollow line-drawing on low-contrast
    fills; alpha blur bleeding raw background color past the mask edge,
    fixed by clamping the blurred alpha to zero outside the hard mask):**
    every one of these 9 canvases also carries a very faint, full-canvas
    grid mesh at every checkerboard cell boundary (almost certainly
    anti-aliasing/JPEG ringing right at the checker's own edges, not a
    deliberate watermark), plus a handful of small isolated compression-
    artifact blobs (~5000-9000px) scattered well outside the actual weapon.
    Both are faint enough to clear the foreground-vs-background color
    threshold, and the grid mesh is dense enough to connect literally
    everything on the canvas into one giant blob at the raw threshold
    stage — so the real weapon's own "biggest connected component" already
    includes this mesh and every stray blob it touches, before any closing
    step even runs. Fixed with a small `binary_opening` (5x5, enough to
    erase the mesh's thin 1-2px lines while leaving every real brushstroke
    intact) applied immediately after thresholding and, critically,
    **before** isolating to the single biggest component — isolating first
    strips away everything not part of the real weapon; isolating only
    *after* a later closing/fill step is too late, since by then the
    weld between the weapon and a stray blob may already be solid and no
    longer separable by opening alone (an earlier version of the crop
    script isolated-then-closed with a large kernel and still leaked stray
    checker squares through the final alpha on 2 of the 9 images, because
    the large closing re-welded a stray back onto the isolated shape
    before the final size-based filtering ever got a chance to exclude it).
  - **The 5x5 opening wasn't strong enough on 2 of the 9 images**
    (`DarkScythe`, `Excalibur`) to fully sever the connecting mesh — a
    slightly thicker-than-usual bridge left a couple of stray squares
    still attached to the isolated shape even after the fix above. Bumped
    to a 6x6 opening for just those two (a plain per-image override dict
    in the crop script, keyed by filename), which does sever the bridge,
    at the cost of also punching a scatter of small holes through their
    own fine engraved filigree (visible as a "speckled" intermediate mask,
    not final output) — an acceptable trade since the pipeline's existing
    big-closing-then-fill-holes step (below) was already designed to
    solidify exactly this kind of small internal gap back to solid before
    the final crop, so the speckling never reaches the saved PNG.
  - **The existing large closing step (25x25, carried over from the
    shield's low-contrast metal-plate case) actively harmed one image.**
    `FlamingBroadSword`'s flame overlay has real, deliberate gaps between
    individual flame tongues (background genuinely should show through
    there) — the 25px closing welded those gaps shut, which pulled raw
    checkerboard-colored pixels into the alpha-opaque region right where
    the flames don't touch. Fixed with the same per-image override
    mechanism, dropping just this one image's closing kernel to 9x9 (large
    enough to smooth jagged pixel edges, small enough to leave every real
    gap between flame tongues open). **Lesson for any future crop reusing
    this pipeline: a kernel size tuned for one image's specific defect
    (a low-contrast fill needing aggressive bridging, or a faint mesh
    needing aggressive erasing) is not safe to assume for every other
    image in the same batch — check each result individually against the
    page's actual background color, the same way every crop in this file
    has been verified, rather than trusting one shared kernel size for a
    whole batch.**
  - **Found later via playtesting (a zoomed-in screenshot): `DarkScythe`,
    `Jonathan`, and `Excalibur` still each had a faint gray checker-remnant
    patch surviving right at the edge of the real weapon, invisible at
    normal card scale but obvious zoomed in.** Root cause turned out to be
    different from, and more stubborn than, the mesh/stray-blob issue
    above: on these 3 images specifically, a soft gradient (halo/shadow)
    directly touches the weapon's own silhouette with no thin bridge to
    sever, so no amount of `binary_opening` on the boolean mask can
    separate it (opening only removes features *thinner* than its kernel;
    a blob of substantial width sitting flush against the real edge isn't
    thin, it's just weakly-colored). Confirmed by checking the pixel data
    directly: the patch's alpha was fully opaque (up to 255) with an RGB
    only mildly different from the checker reference colors, not a low
    "ghost" alpha as first assumed. **Fixed with a border flood-fill
    instead of a global threshold**: classify a generous, permissive
    "background-ish" band (`bg_diff <= tolerance`, tolerance well above the
    normal ~22 cutoff), then `scipy.ndimage.label` it and keep only the
    components that actually touch the canvas border as real background —
    this reaches all the way through a gradient halo that's contiguous
    with the open background outside the object (regardless of how wide
    it is), while a plain global threshold at the same tolerance would
    also have to accept that tolerance *everywhere*, including deep inside
    the object where it isn't safe. `DarkScythe` (tol 60) and `Jonathan`
    (tol 55) both cleaned up perfectly this way, with no other side
    effects anywhere on the artwork.
  - **`Excalibur` couldn't use the same flood-fill fix on its own** — its
    blade has a razor-thin bright chrome highlight running along the edge
    (especially right at the tip), and that highlight's own color is close
    enough to the checker board's light reference that any tolerance loose
    enough to flood through the pommel-area halo *also* floods through a
    thin antialiased dip in the highlight itself, once at the very tip
    (severing it into a separate, discarded component so the tip's last
    sliver vanished) and once further down the blade (punching a small
    hole straight through the highlight). No single global tolerance
    threaded that needle.
  - **Two more defects surfaced later, found only by compositing over the
    card's actual light parchment background instead of the page's own
    dark background.** All of this crop work had only ever been verified
    against the dark page `--bg` (matching the room-card/weapon-slot
    rendering) — a semi-transparent gray checker remnant is invisible
    there but glaringly obvious on the light `--card-bg` parchment behind
    a gallery tile's `.gallery-item-portrait`, which is exactly where a
    user screenshot of the Weapons gallery caught it. **Always composite
    over both the dark in-game background *and* the light card/gallery
    background when checking a crop for leftover artifacts** — a defect
    invisible on one can be obvious on the other, and this batch had one
    of each:
    - `DarkScythe`'s flood-fill fix (tol 60, above) had an unintended side
      effect: the blade's own deliberate negative-space cutouts (a jagged
      V-notch along the top edge, plus the round/crescent holes further
      in) sit far enough inside the silhouette that the border flood
      couldn't always reach them reliably (local anti-aliasing/mesh noise
      right at a narrow cutout's mouth can make a few of its pixels read
      as "not quite background" even at a loose tolerance), so they were
      coming out partially solid instead of staying transparent, invisible
      against the dark page background but a plain gray patch against
      parchment.
    - `Excalibur` (independently) had a genuine dark-fill hole: a thin gold
      sun-ray flourish reaches close to the blade's real outer edge, and
      the *dark blade material* immediately behind it is, by color alone,
      close enough to the checker board's own dark reference to fail the
      strict threshold too — normally `binary_fill_holes` patches this
      kind of internal gap back to solid once it's fully enclosed, but
      because this gap is so close to the true edge it isn't reliably
      enclosed, so a real notch stayed cut into solid blade material,
      landing right next to the sun emblem, easy to miss unless zoomed in.
    - **Fixed both at once** by changing what "foreground" means going
      into the closing/fill-holes step: instead of picking either the
      strict mask (tolerance ~22) or the loose flood-filled mask alone,
      take their **intersection** (a pixel only counts as foreground if
      *both* methods agree) before the biggest-component/closing/fill
      pipeline runs. This works for every failure mode at once, because
      each method is uniquely reliable at a different one: the strict
      mask correctly treats a design cutout as background (it was never
      the problem there), so intersecting with it silently overrides
      flood's occasional false positive inside a cutout; the flood mask
      correctly treats a shadow/halo blob as background, so intersecting
      with it silently overrides strict's false positive there too. Only
      `Excalibur`'s genuine dark-fill hole still needed a second fix on
      top: since the ray-tip gap plainly isn't enclosed within a normal
      25px closing kernel, bumping just that one image's closing kernel to
      55px (`DarkScythe`/`Jonathan` stayed at the normal 25px — a bigger
      kernel is not free, it risks bridging *real* negative-space gaps
      shut too, and 55px visibly did that to nothing else here only
      because 25px was already enough for every other gap in this image)
      successfully bridges across the narrow opening so `fill_holes` can
      solidify the interior correctly. The old pommel-area-rectangle
      surgical patch this replaced is gone entirely — the intersection
      approach needs no manually hand-picked region at all. **Lesson for
      any future case of a real gradient halo touching the object
      silhouette, PLUS any enclosed real detail whose own color happens to
      be background-like:** compute both a strict and a loose mask and
      **intersect** them rather than trying to find one tolerance value
      that's simultaneously loose enough to clear a halo and tight enough
      to protect every enclosed real feature — such a single value may not
      exist, but the intersection of two different-tolerance masks fixes
      both classes of error from opposite directions simultaneously,
      leaving only a genuine "both methods agree it's a gap, but it isn't"
      case (like Excalibur's ray-tip fill) needing a per-image closing
      kernel bump.
- Weapons don't (yet) have their own type-specific flourish the way potions
  get the life-pulse — they currently only get the shared tier system plus
  their own glow color via `glowRgb` (see above). If weapons get a
  distinguishing animation/effect later, add it the same way the potion
  pulse was added: a new class + keyframes layered on top of, not
  replacing, the tier system.
- **Superseded, kept for historical reference only:** every checkerboard-
  background crop/alpha-reconstruction technique documented above (the
  reference-color sampling, strict-vs-flood mask intersection, per-image
  closing kernels, etc.) describes how the current `2.png`-`10.png` files
  *used to be* produced from raw `.jpeg` renders. The user has since
  started pre-removing each render's background themselves before handing
  the file over (an already-transparent RGBA PNG, no checkerboard baked
  in), so none of that reconstruction is run anymore for a fresh weapon
  replacement — the only remaining step is the plain "crop to the alpha
  channel's own bounding box, plus a small pad" step described under
  "Monster artwork" above (needed because a pre-transparentized PNG can
  still ship on an oversized canvas with a lot of empty space around the
  actual item, which undersizes it once `object-fit: contain` sizes
  against the full canvas). The debugging techniques above are still worth
  keeping on file in case a future asset ever again arrives as a
  checkerboard-baked JPEG instead.

### Shield artwork

- `images/shields/<rank>.png` (15-25 in steps of 5, one file per rank — a
  plain ×5 rescale of the original 3-5, see "Value rescale" in
  `js/cards.js`) came from three
  individually user-supplied renders, one per shield, kept as source
  reference: `images/shields/WoodenShieldDamaged.jpeg` → rank 3, now 15
  (Oaken Shield), `images/shields/WoodenRobustShield.jpeg` → rank 4, now 20
  (Round Shield), `images/shields/MetalLionShield.jpeg` → rank 5, now 25
  (Lion Crest Shield) — this mapping was given directly by the user, not inferred from
  the filenames (the rank-3 source is literally named "Damaged" because
  it's drawn with a visible crack across the rim, but it's used as that
  shield's one and only artwork, not as a damaged-state variant — see
  below). This replaced an earlier version that cropped all 3 (plus a
  parallel set of "-damaged" variants) from two shared 1x3 sprite sheets;
  those sheets and the damaged variants are gone now, replaced entirely by
  this one-image-per-shield set.
- **Different source format from every other sprite-sheet crop in this
  file, needing a different crop technique.** Earlier art (monsters,
  weapons, champions, the old shield sheets, card frames) was cropped from
  one big sheet with a plain white/light background. These 3 are each
  already a single subject on their own canvas, but with a **checkerboard
  "transparency" pattern baked into the actual JPEG pixels** instead of
  real alpha (JPEG can't hold an alpha channel, so whatever tool rendered
  these flattened its own transparency-preview checkerboard into the
  output). The checkerboard alternates between two solid colors at a fixed
  ~47px period; sampling a background-only image row (e.g. row 5, always
  clear of the subject) gives the two reference colors directly, no manual
  color-picking needed.
  - **Naive per-pixel "is this pixel close to a checker color" thresholding
    is not enough by itself.** It cleanly separated foreground from
    background for the two wood-toned shields (their whole face contrasts
    well against the dark/gray checker), but the metal Lion shield's flat
    gray plate is close enough in tone to the checker's own gray square
    that large interior regions matched the background reference and got
    excluded, leaving only the high-contrast linework (frame ring, knotwork
    grooves, the lion figure, rivets) as foreground, a hollow line-drawing
    instead of a solid silhouette with holes punched through the plate.
  - **Fixed with a two-stage morphological approach, not a lower/smarter
    threshold:** stage 1 does the naive per-pixel threshold just to locate
    roughly where the subject sits on the canvas (union bbox of every
    component above a small size floor, plus generous padding); stage 2
    re-runs the threshold restricted to that cropped sub-region only (so
    faint unrelated noise elsewhere on the huge canvas can't interfere),
    applies `scipy.ndimage.binary_closing` with a fairly large (~25px)
    square structuring element to bridge the gaps between the linework
    strokes into one connected blob, keeps only the largest resulting
    component, then `binary_fill_holes` to solidify it into one filled
    silhouette. A final small opening+closing pass (~9px) smooths the
    blocky staircase edge the large closing step leaves behind. **Any
    future crop of a similar "checkerboard-background single-object
    render" should use this same two-stage closing approach, not assume a
    plain color-distance threshold will produce a solid shape** — whether
    it does depends entirely on how much the subject's own coloring happens
    to contrast with the checker pattern, which isn't something to rely on.
  - Alpha is fully binary (0 or 255) from the filled mask, then feathered
    with a small (~2.5px) Gaussian blur on the alpha channel only, same
    "soft-mask, not soft-color" edge treatment used elsewhere in this file.
    Verified with the same technique used for earlier crops when no live
    screenshot tool was available: compositing the result over the page's
    actual `--bg` color (`#16161a`) in Pillow and confirming no white/gray
    halo band at the edge.
  - Names are in `SHIELD_NAMES` in `js/shield-icons.js`.
- **Superseded, kept for historical reference only, same as "Weapon
  artwork" above:** the checkerboard-JPEG crop pipeline just described was
  for the *first* version of these 3 files. The user has since replaced
  all 3 a second time with already-transparent, user-background-removed
  PNGs (no checkerboard, no reconstruction needed) — same "just crop to
  the alpha bounding box" step as the current weapon/monster pipeline.
- **Bug found from this second replacement: shields rendered much smaller
  than weapons in both the real card and the gallery tile, even though
  both use the same `--weapon-shield-art-scale` shrink.** Root cause
  wasn't the CSS scale at all — the new shield PNGs shipped on a 677x369
  canvas, but each shield's actual painted content only occupied a roughly
  square ~330x330 area centered in it, with wide empty transparent margins
  left and right. `object-fit: contain` sizes against the **full image
  canvas**, not the visible silhouette, so that leftover empty canvas
  space made the visible shield render far smaller inside the card's
  `--art-*` box than a same-quality weapon PNG (which had little to no
  such padding) did. Confirmed by comparing each file's full canvas size
  against its own alpha channel's bounding box before concluding it was a
  content-padding issue rather than a CSS/scale issue. Fixed the same way
  as any future case of this: crop each file down to its own alpha bbox
  (plus a small ~10-12px pad) before saving as `<rank>.png`, discarding
  the excess transparent canvas entirely. Verified by simulating the exact
  `--art-*`-box-plus-`object-fit:contain` math in Pillow for both a
  weapon and a shield card side by side (rendered near-identical apparent
  size afterward) rather than trusting a browser screenshot, since no
  screenshot tool was available in that session. **Whenever a new item
  render arrives already pre-transparentized by the user, always compare
  its full canvas size against its own alpha bounding box before placing
  it** — a big gap between the two silently undersizes the item in-game
  even though the PNG itself looks fine opened directly in an image
  viewer (which shows the true pixels either way, canvas padding
  included, so it's easy to not notice there either unless you specifically
  check the bbox numbers).

### Card frame artwork

- Every room/weapon/shield card's base frame (the illustrated brown
  border, corner icon boxes, and bottom hexagon that used to be a flat
  `--card-bg` parchment rectangle plus a plain CSS border/glow) is one of
  4 illustrated frames, one per card type, cropped from a user-supplied
  2x2 sheet (`images/CardDesigns.jpeg`, kept as source reference:
  top-left monster, top-right weapon, bottom-left shield, bottom-right
  potion) into `images/frames/monster.png` / `weapon.png` / `shield.png` /
  `potion.png`. Each is a tight crop of that quadrant's non-white bounding
  box, then alpha-masked to drop the crop's own white/near-white
  background and rounded corners, for a different reason than the
  monster/weapon/shield/champion art's thin-line alpha fix: these are
  full-color painted illustrations with no faint anti-aliased linework to
  rescue, but the source sheet draws each rounded-corner card frame with
  a soft drop shadow against a plain white canvas, and that shadow is a
  wide gradient (about 25px at full sheet resolution), not a hard edge.
  A first pass used one conservative white threshold (min channel >= 240)
  for the flood-fill-from-border removal, which cleared the flat white
  but left a visible light gray/pink halo ring where the shadow gradient
  hadn't yet faded past that threshold by the time it reached the frame's
  actual dark border. Lowering the flood-fill threshold to min channel
  >= 150 removed the halo entirely, since the gradient's brightest values
  just before the sharp jump to the dark border color were still well
  under 150. As with the monster/weapon crops, the flood fill only
  removes background pixels connected to the image's outer edge (via
  scipy.ndimage.label), so it can't eat into the light parchment interior
  or a light-colored icon fill, both fully enclosed by the frame's dark
  border and never touching the image edge. A small Gaussian blur on the
  resulting alpha channel feathers the cut edge instead of leaving it
  hard-jagged. Without this the card showed a washed-out white/gray
  fringe around the illustrated frame shape against the page's dark
  background, contradicting the point of a base-frame graphic in the
  first place, nothing outside the frame's own silhouette should be
  opaque.
- **A second, separate cause of the same "white background" symptom,
  found after the alpha-masking above still didn't fully fix it:** even
  with the PNGs themselves fully transparent outside their own
  illustrated shape, `.card`'s own `background: var(--card-bg)` (a cream
  fill, `#f5f2e9`) was still painted underneath every card as a plain
  rounded-rect. Since the frame image's own illustrated rounded corner
  never lines up exactly with `.card`'s CSS `border-radius` (two
  different roundings, one hand-painted, one a fixed `--radius` token),
  the corner region where they diverge showed the cream fill through the
  PNG's now-transparent corner, reading as a leftover white background
  even though the PNG itself had none, most visible at the top-left/
  top-right corners where the two curves diverge the most (straight
  edges barely showed it, since a straight line matches almost exactly
  either way). Fixed with `background-color: transparent` on
  `.card--monster`/`.card--weapon`/`.card--potion`/`.card--shield`
  (overriding just that one longhand of `.card`'s `background` shorthand
  for these 4 types), so the page's own dark background shows through
  any gap instead of a stray cream band. **When diagnosing a "white
  edge/halo" on any image-backed element, check both possible causes
  independently** — the image's own alpha content, and any
  background-color still painted underneath it — since fixing only one
  can look like it "didn't work" when the other is still the visible
  cause; verified here by simulating the exact render pipeline in Pillow
  (crop the source frame, resize to an actual in-game card size, clip to
  a rounded-rect mask at `.card`'s real `--radius`, composite over the
  page's actual dark background color) and confirming zero white/near-white
  pixels in the result, since an actual browser screenshot wasn't available
  in the session that found this.
- Applied as a plain CSS `background-image` on `.card--monster` /
  `.card--weapon` / `.card--shield` / `.card--potion` (`style.css`), with
  `background-size: 100% 100%` — a deliberate non-uniform stretch to
  exactly fill `.card`'s box (100x140 design size), rather than
  letterboxing/padding to match the crop's own aspect ratio. The 4 crops'
  raw aspect ratios (~0.65-0.70) aren't identical to `.card`'s 100:140
  (0.714) or to each other (the shield/potion frames are relatively
  wider/shorter than monster/weapon, from their crenellated/vine borders
  extending less far vertically), but the frames are hand-painted and
  forgiving at card scale — a stretch test at the actual in-game ratio
  showed no visible distortion worth the complexity of preserving each
  crop's exact native ratio (which would need per-type letterboxing and
  leave the card-bg color showing at the letterboxed edges). This still
  layers underneath the existing `--card-border-width`/`--card-glow`
  strength-tier system (see the strength tiers section above) — that
  system was deliberately left in place, unchanged, on top of the new
  frame background; it's still meaningful gameplay signal (a card's
  strength), not a leftover from the old flat-card look, so replacing the
  base card art wasn't reason enough to remove it.
- **The item's artwork and the value number are positioned against the
  frame via percentage boxes, not the old flex layout.** Each type class
  sets 8 custom properties, `--art-left/top/right/bottom` (the frame's
  blank parchment area, where `.card-art` — a wrapper div added around
  `.card-image`/`.card-suit-symbol` in `fillCardFace()`, `js/ui.js` —
  centers the item's artwork via `max-width/max-height: 100%` inside a
  flex container) and `--hex-left/top/right/bottom` (the frame's hexagon,
  where `.card-value-label` itself is now positioned/sized, also via
  flex-centering). Both `.card-art` and `.card-value-label` are
  `position: absolute` with these percentages as their inset, which
  resolve against `.card`'s own padding-box regardless of `--card-scale`/
  `--weapon-slot-scale` — this is why no size tier needs its own override
  for `.card-image`/`.card-art` position the way the old fixed-px
  `height: calc(78px * var(--card-scale))` formula did (still true for
  `--weapon-slot-scale`, which is why `#weapon-slot-card .card-image` /
  `#shield-slot-card .card-image` has no override left in `style.css`,
  unlike `.card-suit-symbol`/`.card-value-label`, which still need a
  font-size override there — percentages size a *box*, not text, so a
  smaller slot's box shrinks for free but its font doesn't).
- The exact percentages per type were tuned by cropping each frame,
  overlaying the candidate box as a rectangle on the actual PNG with
  Pillow, and eyeballing the result against the hexagon/parchment shapes
  (not computed from pixel analysis — the hexagon's interior and the
  surrounding parchment are near-identical in color, which makes
  automatic detection unreliable, whereas the shapes are easy to align by
  eye once outlined). Monster and weapon share identical numbers (their
  frames use the same rail/hexagon layout); shield and potion each have
  their own, since their rails/vine border and hexagon sit at slightly
  different insets. **If any new frame art replaces or adds to these 4,
  re-tune its `--art-*`/`--hex-*` box the same way** — don't assume the
  monster/weapon numbers apply, since they only happen to match because
  those two source frames were laid out identically.
- **The item artwork inside a weapon/shield card can be shrunk independently
  of the `--art-*` box itself** via `--weapon-shield-art-scale` (`:root` in
  `style.css`), a plain `transform: scale()` applied to `.card-art` only on
  `.card--weapon`/`.card--shield` (monster/potion untouched) — added after
  a report that the weapon/shield artwork looked too big inside its frame,
  when the actual `--art-*` box itself was fine. Scaling `.card-art` after
  it's already positioned keeps the artwork centered on the exact same
  point rather than needing the box's own percentages recomputed. Started
  at `0.9` (10% smaller), turned down to `0.85` (15% smaller) on a
  follow-up request, together with the matching `85%` bump on the Weapons/
  Shields gallery tiles' own art shrink (see above) so the real in-game
  cards and their gallery tiles stay visually consistent. **This is a
  single easy-to-tune number, kept in `:root` specifically so a future
  "make it smaller/bigger again" request only needs this one value
  changed**, not a recomputation of any frame's `--art-*` percentages.
- **Monster cards got their own separate, later, independently-tuned
  version of the same mechanism: `--monster-art-scale`** (`:root`), applied
  via `.card--monster .card-art { transform: scale(var(--monster-art-scale)); }`
  right alongside the weapon/shield rule. Kept as its own variable rather
  than folded into `--weapon-shield-art-scale` since it was requested
  separately and there's no reason the two should be forced to move
  together.
  - **Misread, then corrected, which kind of gallery the request meant:**
    the original ask was "Mache die Monster Graphiken (nicht die Karte)
    10% kleiner" — "nicht die Karte" was (reasonably, by analogy with the
    identically-phrased weapon/shield request further up, which really did
    mean "the art inside the card, not the whole card frame") read as "the
    monster art inside the real in-game card, not the card frame around
    it," so `--monster-art-scale` was added to the *real* in-game card as
    described above. The Monsters gallery tile's own
    `.gallery-item-art img` (`max-width`/`max-height`) was deliberately
    left untouched at its existing `90%`, reasoned at the time to already
    coincidentally equal the requested 10%-smaller target. A follow-up "es
    sieht aus als hätte nichts geändert... mache es nochmal um so viel
    kleiner" (about what turned out to still be the real card, now at
    `0.8`) was answered the same way, still only touching the real card.
    Only after that did the user clarify **both requests were actually
    about the Monsters gallery view** ("die Monster Grafiken unter
    'Monsters', die Galerie") — "nicht die Karte" meant not the real
    gameplay card at all, i.e. the opposite kind of "not the card" from
    the weapon/shield precedent's meaning. The real in-game card's
    `--monster-art-scale: 0.8` was kept as-is (reported as looking fine),
    and the actually-intended gallery change was applied at that point:
    `.gallery-item[data-kind='monsters'] .gallery-item-art img`'s
    `max-width`/`max-height` bumped from `90%` to `80%`, matching the real
    card's own final `0.8` so the two ended up visually consistent with
    each other despite the two changes reaching that point by an
    unintentionally roundabout path. **Lesson: when a phrase like "not the
    card" repeats a pattern from an earlier, different request, don't
    assume it carries the same meaning again — confirm which surface
    (real gameplay card vs. a start-screen gallery) is actually meant,
    especially when, as happened here, a coincidental existing value can
    make the wrong interpretation look like it was already satisfied.**
- The old fixed top-color-bar-free tier border/glow system, the
  `hasAura()` pulsing aura, and the potion life-pulse (see "No flat
  top-color bar" and related notes above) are all untouched by this
  change — they're independent `box-shadow`/`::after` layers keyed off
  `--edge-rgb`/tier classes, not the card's background, so they still
  render exactly as before, now on top of an illustrated frame instead of
  a flat parchment rectangle.

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
- **Sword Master's portrait (`images/champions/swordmaster.png`) used a
  different source format and crop technique from the 4 champions above,**
  since its source render (`images/champions/SwordMaster.jpeg`, kept as
  source reference) isn't a 2x2 sheet of thin line-art portraits on a plain
  white background — it's a full-color circular medallion illustration on
  its own individual canvas (a tea-stained parchment background outside the
  circle), the exact same format the paladin/herbalist/rogue/berserker
  portraits actually turned out to already be cropped from
  (`PaladinIconNew.jpeg`/`HerbalistIconNew.jpeg`/`RogueIconNew.jpeg`/
  `BerserkIconNew.jpeg`, also kept as source reference, which supersede the
  stale "2x2 sheet, alpha = 255 − min(R,G,B)" pipeline this file's own
  comment in `js/champion-icons.js` still describes — that comment
  describes an even earlier pipeline no longer in use for any of the 4).
  For this format, cropping is just "keep the circle, drop the parchment
  outside it" — no alpha-threshold reconstruction of thin linework needed,
  since it's a full-color painting, not line art on a removed background.
  - **Finding the exact crop box (a tight square tangent to the circle) by
    eye or by simple dark-pixel thresholding didn't work reliably** — the
    parchment background itself has brown mottled stains and a darker
    vignette near the canvas edges, dark enough in places to fail a
    naive "threshold dark pixels, take the largest connected blob's
    bounding box" approach (it merged the actual circular border with
    unrelated dark background texture into one blob spanning nearly the
    entire canvas, nowhere close to the true circle). **Fixed with
    image-registration instead of segmentation**: since the 4 existing
    champion portraits (700x700 PNGs) and their own individual source
    JPEGs (2048x2048, same circular-medallion format) already existed as a
    known-correct example pair, the exact crop box used for one of them
    (Berserker) was recovered by directly searching for the square crop
    region whose content, resized down, best matches the known output
    (`berserker.png`) — a coarse grid search over crop position/size
    scored by mean pixel difference (on a small downsampled resolution for
    speed), refined with `scipy.optimize.minimize` (Nelder-Mead) around the
    best coarse candidate. This recovered crop box, applied to
    `BerserkIconNew.jpeg`, reproduced `berserker.png` almost exactly
    (median/25th/75th/95th percentile pixel values matched exactly once
    compared with an alpha mask applied to both, confirming the recovered
    box was correct, not just close) — an earlier whole-image, unmasked
    mean-pixel-difference check had looked alarming (means differed by
    ~40/255) but that was a red herring caused by comparing raw RGB in the
    fully-transparent corner regions, which hold leftover, never-rendered
    pixel data unrelated to what's actually visible.
  - Since a second, independent check (a dark-pixel connected-component
    scan) had already found that `SwordMaster.jpeg` and `BerserkIconNew.jpeg`
    share the *exact same* large-component bounding box pixel-for-pixel,
    the two source images are evidently generated from the same fixed
    template/composition (same circle position and radius on the canvas
    every time) — so the crop box recovered from Berserker's known-correct
    example was reused verbatim for Sword Master, rather than re-deriving
    it from scratch, and produced a clean, correctly-centered circular crop
    on the first try (verified by compositing the result over the page's
    actual dark background, per this file's usual verification method, and
    confirming no visible parchment halo or off-center circle). **If a
    future champion's source art arrives in this same "circular medallion
    on its own parchment canvas" format, try this exact same crop box
    first before re-deriving one** — only fall back to the registration
    search above if the new source turns out to use a different circle
    position/radius than this established batch.
  - Resized to 700x700 (matching the 4 existing champion portraits'
    resolution — see "Second real-world bug" under "Loading screen" above
    for why that specific size matters for load performance) with a
    circular alpha mask inscribed exactly touching all 4 edges of that
    square (a ~2px Gaussian blur on the mask only, feathering the cut edge
    the same "soft-mask, not soft-color" way every other crop in this file
    does) — this is why the circle in every one of these 5 portraits
    visually fills its own square canvas edge-to-edge with no margin.

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
    `weakenMonster(card, 30)` (the ×5-rescaled equivalent of the original 6,
    see "Value rescale" in `js/cards.js`) — the same rank-reduction helper
    the Electric weapon effect already used at its own amount (generalized
    to take an `amount` argument for this). Backstab **never removes a
    monster from the room outright**, no matter how weak it already is —
    `weakenMonster()`'s existing floor-at-5 behavior (the ×5-rescaled
    equivalent of the original floor-at-1) applies here exactly like it
    does for Electric, so a monster at or below 35 just drops to rank 5 and
    still needs to be fought/resolved normally afterward, same as any other
    monster card. If an instant-kill-on-low-rank version is ever wanted
    instead, that needs new logic (mirroring `resolveCard()`'s
    room-refill/win-condition handling for an outright removal) — it
    isn't what's implemented now.
- **Herbalist's ability:** a flat one-shot heal — `useAbility()` heals
  `min(25, maxHp - hp)` HP (the ×5-rescaled equivalent of the original 5)
  immediately, same clamped-at-max pattern as
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
  reduces the next 3 hits that would deal any damage by 10 each (the
  ×5-rescaled equivalent of the original 2, never below
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
  damage-reduction counter *on top of* Paladin's Blessing — an earlier
  version ("Rage") reduced incoming damage by 4 for 3 hits, the exact same
  mechanic as Blessing under different flavor text, which read as a reskin
  rather than a distinct ability once actually played. A later version
  ("Frenzy" v2, see below) instead lifted a *restriction* (the weapon's
  degrade limit), but that mechanic was in turn moved off Berserker onto
  the Sword Master champion (see "Sword Master's ability" below) so the two
  champions' active abilities don't overlap. Frenzy as it exists now
  activating it sets `state.berserkerFrenzyCharges = 2` and, for the next 2
  fights (weapon or bare-handed alike, ticking down regardless — same
  "unconditional counter" reasoning as the bug/gotcha under Sword Master's
  ability below), boosts the passive's flat bare-handed damage reduction
  from 10 up to 40 (replacing it, not stacking with it). Since the boost
  only ever applies to a bare-handed fight, activating it also forces
  `state.useWeaponPreference` to `false` (so both charges don't silently
  burn on weapon fights with zero effect), automatically restored to `true`
  the instant the charges run out — `renderWeaponToggle()` (`js/ui.js`)
  keeps the "Using weapon" checkbox in sync with that forced flip. Same
  golden `.ability-wrap--active` glow as every other champion's ongoing
  effect (`renderAbilityActiveGlow()`'s `berserker` branch), same
  "can span fights/rooms/flees, only a fight burns a charge" lifecycle as
  Paladin's Blessing.
- **Sword Master's ability — "Weapon Mastery":** this is the mechanic
  Berserker's Frenzy used to have (see above) before it was moved here, so
  it's an *exact* transplant with two numbers changed (3 charges instead of
  4, this champion's own `ABILITY_MANA_COST` instead of Berserker's) rather
  than a new mechanic designed from scratch:
  - Activating it sets `state.swordmasterMasteryCharges = 3`.
    `isWeaponUsableOn(card)` (`js/state.js`) then ignores
    `weaponMaxMonster` (the "weapon can only be used again on a monster
    weaker than the last one it defeated" degrade rule) entirely while
    `swordmasterMasteryCharges > 0` — a fully degraded weapon can strike any
    monster again, full stop.
  - The charge ticks down on **every one of the next 3 weapon fights**,
    whether or not the override was actually needed that particular fight
    — a plain, predictable "next 3 weapon fights" counter, never on a
    bare-handed fight (a bare-handed fight never touches the weapon's
    degrade ceiling in the first place, so there's nothing for the charge
    to apply to). `fightMonster()` still separately computes
    `masteryOverrode` (from the pre-fight `weaponMaxMonster` value, before
    it gets overwritten for the next fight) purely to pick the right
    flavor text — "overpowered the weapon's limit" when it was actually
    blocked, vs. a plainer "Weapon Mastery is active" when the swing
    would've been legal anyway — but `masteryActive` (just "was the weapon
    used while charges > 0") is what actually decrements the counter.
    - **Bug/gotcha, found via playtesting when this was still Berserker's
      Frenzy (moved here verbatim, since the underlying mechanic and its
      failure mode are unchanged):** an earlier version *only* decremented
      on a fight `masteryOverrode` was true for (mirroring Paladin's "only
      counts if there was actually damage to reduce" rule), reasoning a
      charge shouldn't be "wasted" on a swing that was already legal. This
      looked fine in isolated tests but broke in real play: the very first
      mastery-overridden kill of a strong monster sets `weaponMaxMonster`
      (the ceiling) to that monster's high rank — same formula as any other
      kill — which then makes the weapon legally usable on almost
      everything for a long stretch afterward. The restriction stops
      engaging, so the remaining charge(s) never get spent, and the ability
      button/status line sit stuck showing e.g. "1 left" indefinitely while
      the player keeps fighting freely — it looks like the ability never
      expires. Reported by the player (back when this was Frenzy) as "the
      limit never goes away even though it still says 1 left" after
      killing ~10 monsters. Fixed by making the charge unconditional (see
      above) — **don't reintroduce an "only spend it when it mattered"
      version of a fight-count-based charge** unless the countable event is
      guaranteed to keep recurring at a steady rate; here it wasn't, because
      using the ability changes the very condition (`weaponMaxMonster`)
      that would trigger its own future use.
  - Sword Master's **passive** (`CHAMPION_DESCRIPTIONS.swordmaster` in
    `js/champion-icons.js`) shares the same spot in `fightMonster()` as the
    Sturdy weapon effect — the "usable-strength ceiling can never drop by
    more than N per fight" cap — just weaker (max drop 15, vs. Sturdy's 10).
    If a Sturdy weapon is equipped while playing Sword Master, the smaller
    (more generous) of the two caps wins, computed as a single `maxDrop`
    value in `fightMonster()` rather than two separate, conflicting
    ceiling-update branches.
  - The degrade ceiling (`weaponMaxMonster`) still updates normally after a
    mastered swing (same Sturdy/passive-aware formula as any other fight,
    see above) — Weapon Mastery only lifts the restriction check for that
    one swing, it doesn't stop the weapon from degrading. A later,
    non-mastered (or charge-exhausted) swing still respects whatever
    ceiling that fight left behind (still subject to the passive's own 15
    cap either way).
  - Same golden `.ability-wrap--active` glow as every other champion's
    ongoing effect — `renderAbilityActiveGlow()` has an `||` branch for
    `state.champion === 'swordmaster' && state.swordmasterMasteryCharges > 0`
    — and the counter hitting 0 is what ends the effect, same "can span
    fights/rooms/flees" behavior as Paladin's/Berserker's.
  - `renderWeaponSlot()` (`js/ui.js`) also reflects Weapon Mastery directly
    in `#weapon-status`'s restriction line while active (`"Weapon Mastery
    overrides the degrade limit (N left)"` instead of the normal `"Can only
    defeat monsters weaker than X"`), since that line would otherwise keep
    claiming a restriction that doesn't currently apply. Called both from
    the normal post-fight re-render and right after activating the ability
    (`js/main.js`'s ability-button handler), so the status text updates
    immediately on activation, not just after the next fight.
  - No dedicated ability-icon artwork yet (`ABILITY_ICONS` in
    `js/ability-icons.js` has no `swordmaster` entry) — `abilityIconFor()`
    falls back to showing no icon on `#ability-btn` until one is supplied,
    same "leave it unmapped until the art exists" convention as a new
    champion's portrait (see "Portrait placeholder for missing artwork"
    above).
  - **Lesson for future champion abilities:** if a new ability ends up
    being "reduce/increase a number by X for N uses" in the same spot
    another champion's ability already occupies, prefer lifting/granting a
    *rule exception* instead (bypassing a restriction, changing what's
    legal) so each champion's active ability is mechanically distinct, not
    just reskinned flavor text over the same math — this is exactly why
    the degrade-limit-override mechanic itself was moved off Berserker
    (onto Sword Master) rather than left to coexist with Berserker's own
    reworked, damage-reduction-flavored Frenzy.
- **Mana cost per champion** — the numbers to tweak if these ever need
  rebalancing — lives in one place: `ABILITY_MANA_COST` in
  `js/ability-icons.js` (`abilityManaCostFor()` reads from it everywhere
  else). Currently: Paladin 5, Herbalist 4, Rogue 3, Berserker 4,
  Sword Master 4.
- **Ability name/description text** — the plain-language explanation shown
  in both the rules screen and the info popup below — lives in one place
  too: `ABILITY_DETAILS` in `js/ability-icons.js` (`abilityDetailsFor()`).
  Keep this in sync with the actual mechanic whenever an ability's numbers
  change (e.g. Blessing's "2" or Frenzy's "4 weapon fights") — same
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

## Card flip (description back face) (custom addition, not part of the
original Scoundrel rules)

- Right-click (desktop) or a long press (touch, where there's no
  right-click) on any card-shaped element flips it in place, a real 3D
  animation, to reveal its full flavor description on the back — added
  because the Weapons gallery's old "click a tile to open a detail popup"
  flow no longer exists once a weapon tile's click means select/deselect
  instead (see "Weapon Deckbuilder" above), so descriptions needed a new
  home that doesn't collide with a card's normal click behavior anywhere
  else in the game either. Per explicit request: "generell einfach
  rechtsklick und gedrückthalten macht beides, dass die Karte umgedreht
  wird" (right-click and long-press both just flip the card, in general) —
  and, since "wir später wichtige Beschreibungen brauchen" (future
  features will need important descriptions shown this way too), this was
  built as one generic, reusable mechanism from the start rather than a
  one-off for the Deckbuilder alone.
- **Works on real room cards, the equipped weapon/shield slot, and
  Deckbuilder tiles — deliberately NOT the Monsters/Shields/Champions
  galleries**, which already have their own working "click a tile to see
  its description" flow (the detail popup, `renderGalleryDetail()`) that
  didn't need replacing. Any element that should be flippable carries its
  description via a plain `data-flip-desc` attribute (and a
  `data-flip-name` heading to go with it) — set by `renderCard()`/
  `renderWeaponSlot()`/`renderShieldSlot()` (via a new `cardDescriptionText
  (card)` helper in `js/ui.js`, mirroring `flavorNameFor()`'s per-type
  branching but returning the *fuller* blurb — `monsterDescriptionFor()`/
  `potionDescriptionFor()`/`weaponDescriptionFor()`/
  `rangedWeaponDescriptionFor()`/`shieldDescriptionFor()` — rather than the
  short name `cardTooltipText()` shows on hover) and by
  `buildDeckbuilderWeaponTile()`. `potionDescriptionFor()`/
  `POTION_DESCRIPTIONS` (`js/potion-icons.js`) are new — potions never had
  a gallery of their own, so no description table existed for them before
  this feature needed one for every card type. A future card-shaped
  element that should support this same flip just needs those two dataset
  attributes set; nothing else to wire up per-element, the delegated
  listeners below (like the hover tooltip's) already cover it.
- **el ITSELF becomes the flip's rotating front face**, `flipCard(el)`/
  `closeCardFlip()`/`closeCardFlipImmediate()` in `js/ui.js` — a new
  `wrapper` div (`.card-flip-active`) is inserted at el's current spot in
  the DOM/layout, sized inline from el's own measured
  `getBoundingClientRect()`; el (with every one of its own real classes,
  frame/background art, tier glow, pulse pseudo-elements, box shadow,
  fully intact) is then moved inside a new `.card-flip-inner` appended into
  `wrapper`, alongside a new `.card-flip-face--back` sibling holding the
  name/description. Both faces get `position: absolute; inset: 0` from the
  shared `.card-flip-face` class, which resolves to exactly el's original
  box either way (an explicit-size `.card` keeps its own width/height per
  CSS's over-constrained-inset rule; a size-less `.gallery-item` Deckbuilder
  tile instead stretches to fill that same box). el never leaves its real
  DOM subtree (just gets relocated one level deeper temporarily), so it
  still scrolls/resizes exactly like any other card, no coordinate
  snapshot to ever go stale. A standard two-face 3D flip (`perspective` +
  `transform-style: preserve-3d` + `backface-visibility: hidden`, see
  `style.css`). Clicking (or right-clicking again) anywhere on the flipped
  card closes it — no separate "✕" button, the card itself is the toggle,
  same as flipping a real playing card back over.
  - **Superseded first version, kept here for the lesson it taught:** the
    very first implementation cloned el into a `position: fixed` overlay
    anchored to a one-time `getBoundingClientRect()` snapshot, with the
    real el hidden via `visibility: hidden` underneath it. This looked
    right in isolated testing but broke as soon as the real card's scroll
    container (e.g. `#deckbuilder-panel`, which has its own internal
    `overflow-y: auto`, not the page itself) was scrolled after opening a
    flip: the fixed overlay stayed put at its captured screen position
    while the real, hidden card scrolled away underneath it, so the
    flipped card visibly "stuck" in place instead of scrolling with
    everything else — reported directly by the user.
  - **Superseded second version, also kept for the lesson it taught:** the
    fix for the version above kept el itself static in its real DOM spot
    and instead moved only el's *children* into a new `.card-flip-face
    --front` div appended as el's own child, leaving el's own background
    (a real card's illustrated frame, painted via a CSS class on el itself)
    un-rotated and un-hidden underneath the whole time. This looked correct
    on a Deckbuilder tile (whose frame art actually lives on a nested
    `.gallery-item-portrait` child, which gets swept into the front face
    along with everything else), but on a real room/weapon/shield card the
    frame background sits directly on el — visually this read as only the
    weapon's icon flipping in 3D while the surrounding card frame stayed
    flat, reported directly ("flipped das icon von der waffe, aber die
    karte nicht"), and produced a visible size/scale mismatch right around
    the 90° mark, since the frame (not rotating, always full-size) and the
    extracted content (foreshortening through the 3D rotation) were
    changing size at different rates relative to each other, reported as
    the card "größer und kleiner skaliert... nicht smooth". This also
    needed an explicit inline-height lock on el before moving its children
    out (a `.gallery-item`'s height, unlike `.card`'s fixed `calc()`, comes
    purely from its own now-departed children's natural content height,
    and collapsed to ~0 without it) — moving el itself instead removes the
    entire category of bug at once: there's only one rotating object, so
    there's nothing left that can ever get out of sync with anything else,
    and (per the `.card-flip-face` sizing note above) no separate height
    lock is needed either, since the browser's own inset-vs-explicit-size
    resolution reproduces el's original box automatically.
  - **The back face's look.** Reported as reading like "a plain white box"
    that broke the card's own illustrated-frame feel —
    `.card-flip-face--back` uses the same parchment-on-wood texture as
    `#card-tooltip` (`images/backgrounds/GalleryBackground.png`, same warm
    brown border color `#8c6239`) instead of a flat `var(--card-bg)`
    rectangle, so it reads as part of the same card rather than a generic
    popup. Its name heading (`.card-flip-back-name`) was originally
    `var(--accent)` (a gold/tan), reported as hard to read against the
    parchment and switched to `var(--card-text)` (near-black) — the same
    dark color every other piece of text on a light card/parchment surface
    in this project already uses.
  - Only one flip open at a time (`activeCardFlip` in `js/ui.js`) — a
    second right-click elsewhere while one is already open is a no-op
    rather than silently swapping to the new card, since that risked
    feeling accidental (a stray right-click on the wrong spot silently
    replacing what the player was actually reading).
  - `CARD_FLIP_MS` (500) is kept in sync with `.card-flip-inner`'s CSS
    `transition-duration`, same "one JS constant matching one CSS value"
    pattern as `CARD_ANIMATION_MS` in `js/main.js` — `closeCardFlip()`
    waits for the real `transitionend` event before actually restoring el
    to its original spot (so the closing half of the flip is visible, not
    an instant cut), with a `setTimeout(restore, CARD_FLIP_MS + 60)`
    safety net in case `transitionend` never fires.
  - **`closeCardFlipImmediate()`** drops the flip state with no animation,
    but still synchronously restores el to its exact original DOM position
    (right before `wrapper`, then discards `wrapper`) — called at the top
    of `renderRoom()`/`renderWeaponSlot()`/`renderShieldSlot()`/
    `renderDeckbuilder()`, the only places a flippable element's content
    gets torn down and rebuilt (same "about to repaint, clear any
    transient state first" reasoning those functions already apply to
    `hideCardTooltip()`). A room card gets discarded and rebuilt from
    scratch regardless, so restoring its exact position first is moot
    there, but `#weapon-slot-card`/`#shield-slot-card` are persistent DOM
    nodes reused (not recreated) across renders — without this restore,
    the next `renderWeaponSlot()`/`renderShieldSlot()` would still find and
    update the right element by id, but leave it permanently stuck one
    level too deep inside a now-orphaned `wrapper`/`.card-flip-inner`,
    breaking every sibling that assumes it sits directly under
    `#weapon-slot-wrap` (e.g. `#weapon-fragile-bar`'s positioning, or
    `.card-effect-badge`'s own percentage math). A blunt "any re-render of
    any of these four just closes whichever flip is open" rule, not scoped
    to only close a flip if the *specific* element being rebuilt is the one
    that's flipped — simpler to reason about, and examining a card's
    description while some other, unrelated action re-renders the screen
    is a reasonable enough time to let the peek end anyway. `closeCardFlip()`'s
    own restore step additionally guards against a flip having already been
    torn down this way mid-animation (`if (flip.el.parentNode !==
    flip.inner) return;`), for the case where something closes it
    immediately elsewhere before the animated close's own timer/
    `transitionend` fires.
- **Right-click AND long-press work with either a mouse or touch,
  delegated on `<body>`/`document`** (`js/main.js`), same reasoning as the
  existing hover-tooltip listeners just above them (room cards/Deckbuilder
  tiles are torn down and rebuilt on every render, so a per-element
  listener would need constant re-attaching):
  - `contextmenu` on `[data-flip-desc]` calls `event.preventDefault()`
    (suppressing the browser's own right-click menu there specifically,
    nowhere else) then `flipCard(target)`.
  - **Long press originally only listened for touch events** (`touchstart`
    arming a `CARD_FLIP_LONGPRESS_MS` (500) timer) — reasoned as correct
    since phones have no right-click. Reported not working on a laptop:
    "generell einfach rechtsklick und gedrückthalten macht beides" (both
    should just work, in general) turned out to mean literally any pointer
    type, and a laptop trackpad/mouse never fires touch events at all, so
    the long-press path was silently unreachable there. Fixed by adding
    the identical timer-arming logic for `mousedown`/`mouseup` (button 0
    only — a real right-click already opens the flip immediately via
    `contextmenu`, it doesn't need this path too), sharing one
    `armFlipLongPress(target)`/`cancelFlipLongPress()` pair with the touch
    listeners. `mousemove` cancels a pending press only past a small
    tolerance (`FLIP_LONGPRESS_MOVE_TOLERANCE_PX`, 10px) rather than on any
    movement at all, unlike `touchmove`'s unconditional cancel — a held
    mouse can wobble a pixel or two without meaning to cancel, a held
    finger is naturally steadier and any real `touchmove` reliably means
    an intentional scroll/drag.
  - **Gotcha, applies to both pointer types:** a long press's matching
    release (`mouseup`, or touch's synthetic post-`touchend` click
    emulation) always fires a normal `click` shortly after — since
    `flipCard()` already flipped the card open by then, that click would
    otherwise land right back on it and immediately close it again before
    the player could read anything. A `suppressNextCardClick` flag, set
    the instant a long press's timer actually fires (with its own short
    safety-clear timeout in case no click ever follows, e.g. the pointer
    was dragged off before release), is checked by a **capture-phase**
    `click` listener on `document` — capture, not the usual bubble phase,
    so it runs before the card's own normal delegated click handler
    (`#room`/`#deckbuilder-pool`/`#deckbuilder-slots`, all bubble-phase)
    ever sees the same click; consuming the flag there and calling
    `stopPropagation()` keeps that normal handler from firing at all for
    this one swallowed click. The flag is only actually consumed if the
    click's target is inside `activeCardFlip.el` — a genuine, unrelated
    click happening to land within the short safety window elsewhere on
    the page is left alone rather than eaten for no reason. This same
    capture-phase listener (plus a matching capture-phase `contextmenu`
    one) is also what makes clicking/right-clicking an *already*-flipped
    card close it: `event.target.closest('.card-flip-active')` catches
    that case once the suppression check above has already fallen
    through.
- **Escape closes an open flip too** — `closeCardFlip()` was added to the
  existing Escape-key handler alongside every modal overlay's own close
  function (`closeMenu()`/`closeGallery()`/`closeDeckbuilder()`/etc.),
  same list, same pattern.

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
  - `getCardById(id)` (`js/cards.js`) is a plain lookup by id (e.g.
    `"diamonds-30"` or `"monster-25-1"`), checking `CARD_LIST` first and
    falling back to the full monster pool (`getAllMonsterCards()`, see
    "Monster Pool" above) so it can resolve monster ids too, added
    specifically so `TUTORIAL_DECK_IDS` in
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
    also the game's 5th monster kill, so Paladin's passive (heal 10 HP every
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
    reducing the next hit by 10.
  - HP is tracked by hand across the whole script and never drops below
    ~38/100 (ends there, after the final Blessing-reduced hit), tuned
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

## Loading screen / asset preloading (custom addition)

- Opening `index.html` locally via `file://` (or from a fast local dev
  server) loads every image effectively instantly, so nothing here showed up
  during normal development. Once actually hosted (e.g.
  lastdeckstanding.com), images arrive over a real network connection, and
  cards/portraits used to visibly pop in blank-then-loaded on a fresh page
  load as the browser fetched each PNG lazily on first render. `js/preload.js`
  (loaded last, after every other script) fixes this: it preloads every
  card/champion/ability image up front behind a `#loading-screen`, so by the
  time the start screen appears every image is already sitting in the
  browser's cache and renders instantly from then on, no more pop-in.
- `#loading-screen` (`index.html`) is a third top-level screen alongside
  `#start-screen`/`#game-screen`, direct child of `<body>`, same `.hidden`
  toggling pattern, shown first (`#start-screen` now starts with `.hidden`
  in the markup, unlike before this existed). It has its own heading (shares
  the `#start-logo` look via a `#start-logo, #loading-logo` combined CSS
  selector), a small progress bar (`#loading-bar`/`#loading-fill`), and a
  percentage readout (`#loading-text`).
- `collectPreloadImageUrls()` in `js/preload.js` gathers every image URL
  straight from the existing data (`CARD_LIST`, `CHAMPIONS`,
  `ABILITY_ICONS`, `WEAPON_EFFECTS`) rather than a separately hand-maintained
  list, so a newly added card, champion, ability, or weapon effect is
  automatically preloaded too. **Keep it this way** rather than hand-listing
  paths. If a future asset type is added outside those sources (e.g. a new
  data file following the "Keep the gallery in sync" pattern elsewhere in
  this file), add it to `collectPreloadImageUrls()` in the same change, the
  same discipline as keeping the galleries themselves in sync.
  - **Any image applied purely via CSS** (`background-image`,
    `border-image-source`, `mask-image`/`-webkit-mask-image`, e.g. the
    illustrated card/champion frames or the start-screen button plaque
    artwork) isn't in any of those data sources at all, so it can't be
    picked up by the loop above. `collectCssImageUrls()` handles this
    whole category at once by scanning the already-parsed `style.css`
    stylesheet itself via `document.styleSheets` for every `url(...)`
    pointing under `images/`, rather than hand-listing each such path —
    see the "Real-world bug" entries below for why a hand-list here
    specifically kept failing in practice. `SYMBOL_IMAGE_URLS` is the one
    remaining hand-list, for the couple of images applied via a
    hand-written `<img>` string in `js/ui.js` rather than through CSS or a
    data field, `collectCssImageUrls()` can't see those either.
- Each image is loaded via a plain `new Image()` and resolves the preload on
  either `onload` or `onerror`, so one broken/missing image can't hang the
  loading screen forever, it just won't be warm in the cache (same as if
  this preloader didn't exist). A `PRELOAD_TIMEOUT_MS` (15s) fallback also
  force-finishes the whole preload if something stalls without ever firing
  either event, for the same reason.
- **Real-world bug, only visible on the actual hosted site
  (lastdeckstanding.com), never locally:** reported as "loads for a long
  time, and afterward images still aren't loaded, buttons are unstyled for
  a few seconds, weapons, monsters, everything." Root cause had nothing to
  do with the preload *logic* above, which was already correct, it was
  that several of the source PNGs it was faithfully preloading were
  drastically oversized for how they're ever actually displayed: the 4
  champion portraits (`images/champions/<id>.png`) were still their raw
  1990x1990 crop-pipeline output at 7.9-8.7MB **each**, and
  `images/frames/champion.png` was 1617x2098 at 5.4MB, together over 33MB
  of a roughly 50MB total preload payload, even though neither is ever
  rendered larger than a few hundred CSS px anywhere in the UI (a
  champion-select/gallery tile portrait, or the tiny `#champion-badge`
  circle, see "Champion artwork"/"Card frame artwork" above for exactly
  where). Locally (`file://`/localhost) this is instant regardless of file
  size, so it was invisible in dev; on a real hosted connection, that
  payload could still be mid-download when `PRELOAD_TIMEOUT_MS` fired,
  which forces the loading screen to reveal the start screen anyway with
  those images still loading in the background, i.e. the exact "buttons
  unstyled for a few seconds" symptom reported, since some of those
  buttons/tiles sit behind the same not-yet-cached images. **Fixed by
  resizing the 4 champion portraits and the champion frame down to 700px
  on their long/relevant edge** (matching the resolution the other 4 card
  frames were already at) and re-saving with `Pillow`'s `optimize=True,
  compress_level=9`, cutting each champion portrait from ~8.3MB to
  ~1.0MB and the champion frame from 5.4MB to 1.1MB, roughly a 33MB
  reduction with no visible quality loss at any of their actual on-screen
  sizes (verified by simulating the resize in Pillow and checking the
  result held up before overwriting the real files, since no live
  screenshot tool was available in that session). **Lesson for any future
  art asset added to this project: always check a newly cropped/exported
  PNG's pixel dimensions and file size against where it's actually
  displayed (its CSS box size, accounting for a reasonable ~2x DPI
  headroom) before committing it** — a crop tool's default/source-canvas
  export resolution can be wildly larger than anything the UI ever needs,
  and unlike a mis-cropped bounding box (which is visually obvious), an
  oversized-but-correctly-cropped image looks completely fine in isolation
  and only surfaces as a real-connection loading-performance bug, not
  something a local `file://` preview will ever catch.
- **Second real-world bug, same live-site symptom, reported again via a
  screenshot of the start screen itself:** every button (`Neues Spiel`,
  `Champions`, `Waffen`, ...) rendering as a plain flat dark box with no
  wood/gold plaque artwork at all for the first few seconds. This turned
  out to be a second instance of the exact same root cause as the frame
  images further up ("Card frame artwork" above): `images/frames/
  button-primary.png` (used by `#start-new-game-btn`/`#flee-btn`) and
  `images/frames/button-secondary.png` (used by every `#start-nav`
  button) are also applied via CSS `border-image-source`, and were simply
  never added to the `FRAME_IMAGE_URLS` hand-list that existed at the
  time, since nobody remembered to when that CSS was written. Since these
  two files style literally every button on the very first screen a
  player sees, this was the single worst-case instance of this bug
  category so far. **Fixed properly this time instead of patching the
  hand-list a third time**: replaced `FRAME_IMAGE_URLS` entirely with
  `collectCssImageUrls()` (see the bullet above), which finds every
  CSS-referenced `images/` path by scanning the live stylesheet, so this
  whole bug category (a new CSS background/border/mask image quietly
  missing from preload) can't recur regardless of what CSS is added later.
  - **Gotcha hit writing that scanner, worth remembering for any future
    code that walks `CSSRuleList`s:** the first version checked
    `if (rule.cssRules) { scanRules(rule.cssRules); return; }` to decide
    whether a rule was a grouping rule (`@media`, `@keyframes`, ...) that
    needed recursing into instead of being read directly, on the
    assumption that only a grouping rule would ever have a `cssRules`
    property. That assumption held for a long time, but Chrome (with CSS
    nesting support) now gives every plain `CSSStyleRule` a `cssRules`
    property too (an empty `CSSRuleList` when the rule has no nested
    rules, as is the case for every rule in this project's own
    non-nested `style.css`) — still just as truthy as a real grouping
    rule's populated one. The early-return branch fired for every single
    rule in the stylesheet, so every rule got treated as "must be a
    grouping rule, recurse instead of reading it", found nothing nested
    (there was nothing to find), and returned having never read that
    rule's own `cssText` at all — `collectCssImageUrls()` silently came
    back empty. Fixed by always scanning a rule's own `cssText` first,
    unconditionally, and only additionally recursing when
    `rule.cssRules.length > 0` (a real, non-empty nested list), rather
    than ever treating "has a `cssRules` property" as a signal on its
    own. Caught via the browser's live DOM (`document.styleSheets`),
    not by reading the code, since this only manifests once actually
    evaluated against a real stylesheet in a real browser.

## Localization / Options screen (custom addition, not part of the original
Scoundrel rules)

- The game is fully bilingual, German and English, and defaults to
  **German** for a first-time visitor. The player switches languages from
  a new **Options** screen (`#options-overlay`), reachable from an
  "Optionen"/"Options" button on the start screen's nav row (alongside
  Champions/Weapons/Shields/Monsters/Anleitung/Tutorial) and from a
  matching button inside the in-game hamburger menu (`#menu-options-btn`,
  between "New Game" and "Main Menu"). The latter closes the menu first
  (`closeMenu()`) before opening Options, the same single-overlay-swap
  pattern "Anleitung" already uses for the rules text, so two dimmed
  overlays are never stacked on top of each other. `#options-overlay`
  reuses `#menu-overlay`/`#gallery-overlay`/`#champion-select-overlay`'s
  exact shared chrome (dimmed backdrop, panel, close button, title — the
  same selector groups in `style.css` just got `#options-overlay`/
  `#options-panel`/`#options-close-btn`/`#options-title` added to them)
  rather than duplicating it, following that section's existing pattern.
- **`js/i18n.js`** is the mechanism: `getLang()`/`setLang(lang)` read/write
  the player's choice to `localStorage` (key `scoundrel-lang`, wrapped in
  try/catch since `localStorage` can throw in some contexts, e.g. private
  browsing), falling back to `'de'` if nothing is stored yet or storage
  itself is unavailable. `t(key, vars)` looks up `key` in the `I18N` table
  for the current language (falling back to English, then to the bare key
  itself, if a translation is ever missing, so a forgotten key shows up as
  visibly wrong text rather than a blank UI or a thrown error) and
  substitutes any `{placeholder}` tokens it finds from `vars`. `i18n.js` is
  loaded first, before every other script (`index.html`), specifically so
  `getLang()`/`setLang()`/`t()` are guaranteed to exist by the time any
  later script's top-level code runs.
- **Every plain UI string that isn't tied to a specific card/champion/
  effect's own data** (buttons, headings, aria-labels, the dynamic fight/
  ability/flee messages built in `js/state.js`, and the full `#rules` HTML
  block) lives in `I18N.en`/`I18N.de` in `js/i18n.js`. A card/champion/
  effect's own name+description data (monster/weapon/shield/potion names
  and gallery blurbs, champion names/descriptions, ability names/
  descriptions, weapon-effect names/descriptions) instead lives in that
  data's own file (`js/monster-icons.js`, `js/weapon-icons.js`,
  `js/shield-icons.js`, `js/potion-icons.js`, `js/champion-icons.js`,
  `js/ability-icons.js`, `js/weapon-effects.js`), each restructured to a
  `{ en: {...}, de: {...} }` table read by `getLang()` at call time (e.g.
  `MONSTER_NAMES[getLang()][rank]`) — this keeps a card's data and its
  translations next to each other, the same file-per-concern split the
  project already used before i18n existed, rather than moving every name
  in the game into one giant `i18n.js` dictionary. Adding a third language
  later means adding one more per-key entry to each of these tables, never
  restructuring anything.
- **`CHAMPIONS` (`js/champion-icons.js`) and `WEAPON_EFFECTS`
  (`js/weapon-effects.js`) are accessed directly as plain properties**
  (`champ.name`, `champ.description`, `WEAPON_EFFECTS[id].name`, `...
  .description`) all over `js/ui.js`/`js/state.js`/`js/main.js`, not
  through a function call the way `monsterNameFor(rank)` etc. are — so
  simply storing a plain string on those objects would freeze it in
  whatever language was active the moment the object was built (at script
  load time, always before any language switch could happen). Both use a
  JS **getter** instead (`get name() { return
  CHAMPION_NAMES[getLang()][id]; }`, same idea for `WEAPON_EFFECTS`'
  `name`/`description` via a shared `weaponEffectText()` helper) so every
  existing call site keeps working completely unchanged, while the value
  returned is re-read from the current language every single time it's
  accessed — switching language live-updates anything already holding a
  reference to one of these objects (e.g. `state.equippedWeapon`'s effect
  badge) with no extra wiring needed. `ABILITY_DETAILS`
  (`js/ability-icons.js`) does **not** need this trick, since
  `abilityDetailsFor(championId)` is a plain function already re-read at
  render time (`renderAbilityInfo()` in `js/ui.js`), same as
  `monsterNameFor()`/etc. Weapon-effect badge icon letters (V/E/S/F)
  deliberately stay fixed regardless of language — they're a compact
  internal code, not required to match the translated name's own first
  letter (e.g. Sturdy's German name "Robust" still shows badge "S").
- **Applying a language to already-rendered content** is
  `applyLanguage(lang)` in `js/main.js`: calls `setLang(lang)`, sets
  `document.documentElement.lang`, `applyStaticI18n()` (below), then
  `renderAll()` unconditionally — `renderAll()` is safe to call any time,
  even before a game has started (it just redraws the empty-room
  call-to-action and the default equipment-slot placeholders in the new
  language), so there's no need to branch on which screen is currently
  visible. The two language buttons in `#options-overlay`
  (`.lang-btn[data-lang="de"]`/`[data-lang="en"]`) call this directly on
  click. A gallery/champion-select/gallery-detail overlay doesn't need any
  special-case refresh logic for a language switch mid-session, since
  none of those screens can be open at the same time Options is (Options
  is reachable only from the start screen's nav row or the in-game menu,
  neither of which coexists with those other overlays) — each of them
  already re-renders its content fresh from current data every time it's
  opened (`renderGallery()`/`renderChampionSelect()`), so it naturally
  picks up whatever language is active by the next time it's opened.
- **`applyStaticI18n()`** (`js/ui.js`) is the one function that translates
  every static piece of markup in `index.html` — it walks
  `[data-i18n]` (sets `textContent`), `[data-i18n-html]` (sets `innerHTML`,
  used only for `#rules`, whose translated value is a full HTML block
  including its own `<h3>`/`<p>`/`<ul>`/`<strong>`/`<br>` structure, stored
  as one string per language in `I18N.*.rulesHtml` rather than split into
  one key per paragraph, since the nested tags don't translate cleanly
  element-by-element) and `[data-i18n-aria]` (sets the `aria-label`
  attribute). Called once on initial page load (before `renderRoom()`
  etc., so the very first paint already shows the right language instead
  of flashing English/German first) and again from `applyLanguage()` on
  every switch. Any newly added static button/heading/aria-label should
  get a `data-i18n*` attribute + a key in `I18N` the same way, rather than
  being left as a hardcoded string — this is now a standing rule, the same
  "keep the gallery in sync" discipline the project already applies to
  monster/weapon/champion data elsewhere in this file.
- **Dynamic gameplay messages** (`js/state.js`'s `fightMonster()`,
  `drinkPotion()`, `equipWeapon()`/`equipShield()`, `fleeRoom()`,
  `useAbility()`/`resolveBackstab()`/`cancelBackstab()`, and
  `resolveCard()`'s win/lose suffixes) were rewritten from inline template
  literals to `t('key', { ...vars })` calls, one key per distinct sentence/
  suffix (e.g. `fightWithWeapon`/`fightBareHanded` for the two base fight
  sentences, `fightFragileCrackingSingular`/`...Plural` for the one
  German/English grammatical number distinction that needed handling —
  computed by the caller picking whichever key applies, rather than
  templating a raw count into an English-only "use/uses" fragment).
  Deliberately **full-sentence templates per language, not fragment
  concatenation** (e.g. no shared `{how}` fragment glued into one template
  the way the original English-only code did) — German reorders and
  reinflects a sentence around a clause like "with your weapon" /
  "bare-handed" far more than simple word substitution can handle, so each
  language's complete sentence is written out in full in `I18N.en`/`.de`
  rather than assembled from smaller, language-neutral pieces.
- **No em dashes were carried into any of the new/rewritten message
  strings** (per this file's existing "No em dashes" convention above) —
  every message that used to join two clauses with " — " now uses a comma
  or a period instead (e.g. "Fought X with your Y, took N damage." /
  "Hast X mit deiner Y bekämpft, N Schaden erlitten.").
- **The Tutorial's coachmark text** (`js/tutorial.js`) follows the same
  pattern: every `TUTORIAL_STEPS` entry has a `textKey` (e.g.
  `tutorialStep1`) instead of an inline `text` string, and
  `showTutorialStep()` calls `t(step.textKey)` when displaying it. The
  Next/Start/Finish button labels are similarly looked up via `t()`
  (`tutorialNext`/`tutorialStart`/`tutorialFinish`) rather than hardcoded.
  Mid-tutorial language switching isn't specially handled (Options isn't
  reachable from inside an active tutorial's dimmed UI except via
  `#menu-btn`, which is deliberately exempt from the dimming — see
  "Tutorial" below) — if a player does switch language that way, only the
  *next* coachmark shown reflects the new language, which is an accepted,
  minor edge case rather than something worth extra plumbing for.

## Local dev / preview

- `.claude/launch.json` runs a plain `python -m http.server` on port 5173 so
  the game can be previewed with working JavaScript (opening `index.html`
  directly via `file://` also works, but some preview tools only render a
  static snapshot without executing scripts).
