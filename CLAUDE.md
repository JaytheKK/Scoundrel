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
- Files:
  - `index.html` — page structure
  - `style.css` — styling
  - `cards.js` — the 44 card definitions (loaded before game.js)
  - `game.js` — game state, logic, and rendering
- Keep game **logic** (deck, rooms, combat rules) separate from **DOM/rendering**
  code as much as practical, so logic can be tested/reasoned about on its own.
- Everything user-facing (card names, buttons, messages) is in **English**.
- Build incrementally: deck/shuffle → room mechanic → combat/weapon/potion
  logic → win/lose conditions → UI polish. Verify each step before moving on.

## Card architecture (important — read before adding/editing cards)

- Every card is defined **individually** in `cards.js` via its own `makeCard(suit, rank, overrides)`
  call — not generated in a loop. This is deliberate: it keeps each of the 44
  cards independently editable/extendable, which matters once special-ability
  cards are added later (each card can get a custom `name`, `image`, or
  `effect` via the `overrides` argument without touching shared generation code).
- Each card has an `image` field, currently `null` for all cards. When `null`,
  `renderCard()` in `game.js` draws a CSS placeholder (suit symbol + rank,
  colored by type: green=monster, blue=weapon, red=potion). Once real artwork
  (including pixel art) exists, set a card's `image` to a file path and the
  renderer automatically shows that image instead — no other code changes
  needed. `image-rendering: pixelated` is already set on `.card-image` in
  `style.css` to keep future pixel-art sprites crisp.
- `effect` is reserved and currently unused — the hook point for future
  special-ability cards (e.g. `onReveal`, `onResolve` callbacks).

## Local dev / preview

- `.claude/launch.json` runs a plain `python -m http.server` on port 5173 so
  the game can be previewed with working JavaScript (opening `index.html`
  directly via `file://` also works, but some preview tools only render a
  static snapshot without executing scripts).
