// ---------------------------------------------------------------------------
// Scoundrel — weapon Deckbuilder (custom addition, not part of the original
// Scoundrel rules).
//
// Lets the player choose which weapon cards (melee and ranged, see
// js/cards.js's CARD_LIST) actually go into the deck for the next game,
// instead of every weapon card always being included unconditionally. This
// is the system CLAUDE.md's "Ranged Weapons" section described as planned
// but not yet built, every card's `deckCost` field was inert data until now
// — see getSelectedWeaponCardsForDeck() below and getFreshDeck() in
// js/cards.js for how the selection actually reaches a real game.
//
// Plain module-level state, not part of `state` in js/state.js: it's a
// meta-choice made on the start screen before a game exists, not something a
// running game itself needs to reason about, the same way champion-select's
// choice is just a plain argument to initGame() rather than something
// initGame() reads off `state`. Unlike a champion pick, this selection
// persists across games (nothing resets it) since it's a standing loadout,
// not a per-run choice. No DOM code in this file, same discipline as
// js/state.js — see renderDeckbuilder() in js/ui.js for the UI, and the
// click wiring in js/main.js.
// ---------------------------------------------------------------------------

/** How many weapon cards the player may bring into a game at once. A plain,
 * easy-to-raise constant on purpose ("jetzt werden es 10", i.e. this is the
 * number for now, not necessarily forever) — renderDeckbuilder() (js/ui.js)
 * always draws exactly this many slot boxes, whatever the number is, so
 * raising it later needs no other change. */
const DECKBUILDER_MAX_SLOTS = 10;

/** Total deckCost (see js/cards.js) the selected weapons may add up to. Set
 * to 270, deliberately matching the 9 melee weapons' own deckCost sum
 * (10+15+...+50) exactly, rather than the original 300 CLAUDE.md's plan
 * first proposed (before anyone had actually added up what the melee set
 * costs) — at 270, the default all-melee loadout (see
 * DECKBUILDER_DEFAULT_IDS below) sits exactly AT the budget cap even though
 * a slot is still free, so swapping in a bow genuinely requires removing
 * something first, the loadout can't just be padded out for free. This is
 * what makes the budget cap a real, reachable constraint rather than a
 * dormant one — see canSelectDeckbuilderWeapon() below for where both caps
 * (slots and budget) are enforced independently of each other. */
const DECKBUILDER_BUDGET = 270;

/** Every weapon card in the catalog (melee, then ranged, matching the order
 * they're listed in CARD_LIST / shown in the Deckbuilder's pool), read fresh
 * each time rather than cached, so it always reflects CARD_LIST as-is. */
function getAllWeaponCards() {
  return CARD_LIST.filter((card) => card.type === 'weapon');
}

/** Starting loadout for a session that's never touched the Deckbuilder: all
 * 9 melee weapons, no bows (deckCost sums to exactly DECKBUILDER_BUDGET, see
 * above). Reproduces the game's pre-Deckbuilder feel (every melee weapon
 * always in the deck) as the default, while leaving the player free to swap
 * any of them out for a bow — though, since this already sits at the budget
 * cap, a swap (remove one, then add another) is required; the one
 * remaining slot alone isn't enough on its own to add anything for free. */
const DECKBUILDER_DEFAULT_IDS = CARD_LIST.filter((card) => card.suit === SUITS.DIAMONDS).map(
  (card) => card.id
);

const deckbuilderState = {
  // Ordered array of selected weapon card ids (js/cards.js ids, e.g.
  // "diamonds-30" / "ranged-15") — order is slot order (index 0 = the first
  // slot box), see renderDeckbuilder() in js/ui.js. Never longer than
  // DECKBUILDER_MAX_SLOTS, and its deckCost sum never exceeds
  // DECKBUILDER_BUDGET — selectDeckbuilderWeapon() below is the only way to
  // grow it, and it enforces both limits before ever pushing an id. A plain
  // compacted list, not a fixed-position slot map like the in-room 2x2 grid
  // (see CLAUDE.md) — removing one just shifts every later id down, there's
  // no reason a loadout needs to remember which exact box a weapon sat in.
  selectedIds: [...DECKBUILDER_DEFAULT_IDS],
};

function getSelectedWeaponIds() {
  return deckbuilderState.selectedIds;
}

function isWeaponSelected(cardId) {
  return deckbuilderState.selectedIds.includes(cardId);
}

/** Sum of deckCost across every currently selected weapon. */
function selectedWeaponValueSum() {
  return deckbuilderState.selectedIds.reduce((sum, id) => {
    const card = getCardById(id);
    return sum + (card ? card.deckCost : 0);
  }, 0);
}

/** Whether `card` could be added to the loadout right now, and which limit
 * is stopping it if not — used both to decide whether to actually add it
 * (selectDeckbuilderWeapon() below) and by the click handler in js/main.js
 * to know which stat line (slot count or budget) to also flash, on top of
 * always wiggling the clicked tile itself either way, per the original
 * request.
 * @returns {ok, reason} — reason is 'slots' | 'budget' | null. */
function canSelectDeckbuilderWeapon(card) {
  if (deckbuilderState.selectedIds.length >= DECKBUILDER_MAX_SLOTS) {
    return { ok: false, reason: 'slots' };
  }
  // Checked even when a slot is still open — going over budget blocks a pick
  // just as much as a full loadout does, per the original request ("auch
  // wenn es noch einen Slot gäbe... geht ja nicht weil der max Wert nicht
  // überschritten werden darf").
  if (selectedWeaponValueSum() + card.deckCost > DECKBUILDER_BUDGET) {
    return { ok: false, reason: 'budget' };
  }
  return { ok: true, reason: null };
}

/** Adds a weapon to the loadout by id, if canSelectDeckbuilderWeapon() above
 * allows it. Returns the same { ok, reason } shape so the caller can react
 * (wiggle the tile, etc.) without a separate lookup. A silent no-op (still
 * { ok: false, reason: null }) if the card is already selected or the id
 * doesn't resolve to a real card — neither should happen from the UI, but
 * this keeps the function safe to call either way. */
function selectDeckbuilderWeapon(cardId) {
  if (isWeaponSelected(cardId)) return { ok: false, reason: null };
  const card = getCardById(cardId);
  if (!card) return { ok: false, reason: null };
  const check = canSelectDeckbuilderWeapon(card);
  if (!check.ok) return check;
  deckbuilderState.selectedIds.push(cardId);
  return { ok: true, reason: null };
}

/** Removes a weapon from the loadout by id (clicking its filled slot).
 * Always succeeds if it was actually selected (there's no limit on
 * removing, unlike adding); a no-op otherwise. */
function deselectDeckbuilderWeapon(cardId) {
  const idx = deckbuilderState.selectedIds.indexOf(cardId);
  if (idx === -1) return false;
  deckbuilderState.selectedIds.splice(idx, 1);
  return true;
}

/** The actual weapon card objects (full objects, straight from CARD_LIST)
 * the current Deckbuilder loadout selects, in the array's own order. Used
 * only by getFreshDeck() in js/cards.js to build a real game's deck, since a
 * deck needs full card objects, not just ids. */
function getSelectedWeaponCardsForDeck() {
  return deckbuilderState.selectedIds
    .map((id) => getCardById(id))
    .filter((card) => card !== null);
}
