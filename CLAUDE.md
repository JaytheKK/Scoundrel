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
  shared entry point for starting/restarting a game — the menu's New Game
  button, the game-over screen's Play Again button, and the empty-room
  call-to-action (shown via `renderRoom()` in `js/ui.js` whenever
  `state.room.length === 0`, e.g. before the first game) all call it, so
  they can't drift out of sync with each other.
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
- Each card has an `image` field. When `null` (currently: weapons and
  potions, which have no artwork yet), `fillCardFace()` in `js/ui.js` falls
  back to a suit-symbol placeholder. Set a card's `image` to a file path and
  the renderer automatically shows that image instead — no other code
  changes needed.
- `effect` is reserved and currently unused — the hook point for future
  special-ability cards (e.g. `onReveal`, `onResolve` callbacks).

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
  the middle of the card, and no J/Q/K/A letters anywhere on the card face
  (11/12/13/14 instead). `card.label` (which still holds "J"/"Q"/"K"/"A")
  is only used for `card.name` / log-message text like "Fought J of
  Clubs...", not for the card face itself.

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

## Local dev / preview

- `.claude/launch.json` runs a plain `python -m http.server` on port 5173 so
  the game can be previewed with working JavaScript (opening `index.html`
  directly via `file://` also works, but some preview tools only render a
  static snapshot without executing scripts).
