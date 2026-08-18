// ---------------------------------------------------------------------------
// Scoundrel — game state and rules logic.
// No DOM code in this file on purpose, so the rules can be reasoned about
// (and later tested) independently of rendering. Depends on cards.js
// (getFreshDeck) being loaded first.
// ---------------------------------------------------------------------------

const state = {
  hp: 20,
  maxHp: 20,
  deck: [],
  room: [],
  equippedWeapon: null,      // card object, or null
  weaponMaxMonster: null,    // null = fresh weapon (no restriction yet);
                              // otherwise the weapon may only be used on a
                              // monster with rank < this value
  potionUsedThisRoom: false, // only the first potion consumed per room heals
  fledLastRoom: false,       // can't flee two rooms in a row
  gameOver: false,
  outcome: null,              // 'won' | 'lost' | null

  // UI preference, not reset by initGame(): whether fighting a monster should
  // use the equipped weapon (when legal) or go bare-handed. Controlled by the
  // "Using weapon" toggle.
  useWeaponPreference: true,
};

/** Fisher–Yates shuffle, returns a new shuffled array (does not mutate input). */
function shuffle(cards) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function initGame() {
  state.hp = state.maxHp;
  state.deck = shuffle(getFreshDeck());
  rollWeaponEffects(state.deck); // 25% chance per weapon, re-rolled every game
  state.room = state.deck.splice(0, 4);
  state.equippedWeapon = null;
  state.weaponMaxMonster = null;
  state.potionUsedThisRoom = false;
  state.fledLastRoom = false;
  state.gameOver = false;
  state.outcome = null;
}

/** Whether the equipped weapon may currently be used against this monster
 * (ignoring player choice — just whether the rules allow it at all). */
function isWeaponUsableOn(card) {
  return (
    !!state.equippedWeapon &&
    (state.weaponMaxMonster === null || card.rank < state.weaponMaxMonster)
  );
}

/** Lowers a monster's rank by 1 (min 1), keeping its identity (artwork,
 * flavor name — both keyed off `baseRank`, not `rank`) but updating its
 * displayed label/name so messages/tooltips stay consistent with the new,
 * weaker value. Used by the Electric weapon effect. */
function weakenMonster(card) {
  card.rank = Math.max(1, card.rank - 1);
  card.label = RANK_LABELS[card.rank] || String(card.rank);
  card.name = `${card.label} of ${capitalize(card.suit)}`;
}

/** @param useWeapon - player's choice, only relevant if the weapon is legal
 * to use here in the first place (see isWeaponUsableOn). Defaults to true
 * (use the weapon whenever legal) so callers that don't offer a choice keep
 * working as before. */
function fightMonster(card, useWeapon = true) {
  const weaponUsable = useWeapon && isWeaponUsableOn(card);
  const weapon = state.equippedWeapon;

  let damage;
  if (weaponUsable) {
    damage = Math.max(card.rank - weapon.rank, 0);

    // Weapon degrade: normally the weapon can only be used again on a
    // monster weaker than the one it just defeated. Sturdy limits how far
    // that usable-strength ceiling can drop in one fight (max -2) instead
    // of dropping straight to the defeated monster's value.
    const previousCeiling = state.weaponMaxMonster === null ? weapon.rank : state.weaponMaxMonster;
    state.weaponMaxMonster =
      weapon.effect === 'sturdy' ? Math.max(card.rank, previousCeiling - 2) : card.rank;

    if (weapon.effect === 'electric') {
      state.room.forEach((roomCard) => {
        if (roomCard.type === 'monster') weakenMonster(roomCard);
      });
    }
  } else {
    damage = card.rank;
  }

  state.hp = Math.max(state.hp - damage, 0);

  let message;
  const how = weaponUsable ? ` with your ${weapon.name}` : ' bare-handed';
  if (weaponUsable && weapon.effect === 'vampiric') {
    state.hp = Math.min(state.hp + 1, state.maxHp);
    message = `Fought ${card.name}${how} — took ${damage} damage. Vampiric weapon healed 1 HP.`;
  } else if (weaponUsable && weapon.effect === 'electric') {
    message = `Fought ${card.name}${how} — took ${damage} damage. Electric surge weakened the other monsters!`;
  } else {
    message = `Fought ${card.name}${how} — took ${damage} damage.`;
  }

  return { message };
}

function equipWeapon(card) {
  state.equippedWeapon = card;
  state.weaponMaxMonster = null; // fresh weapon: no restriction until first use
  return { message: `Equipped ${card.name}.` };
}

function drinkPotion(card) {
  if (state.potionUsedThisRoom) {
    return { message: `Drank ${card.name} — already healed this room, no effect.` };
  }
  const healed = Math.min(card.rank, state.maxHp - state.hp);
  state.hp += healed;
  state.potionUsedThisRoom = true;
  return { message: `Drank ${card.name} — healed ${healed} HP.` };
}

/**
 * Resolves one card from the room by id: applies its effect, removes it from
 * the room, refills the room once only one card remains (classic Scoundrel
 * room-cycle), and checks win/lose conditions.
 * @param options.useWeapon - only relevant for monster cards with a legal
 *   weapon available; see fightMonster().
 * Returns a { message } result, or null if the card wasn't found / game over.
 */
function resolveCard(cardId, options = {}) {
  if (state.gameOver) return null;

  const idx = state.room.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const [card] = state.room.splice(idx, 1);

  let result;
  if (card.type === 'monster') result = fightMonster(card, options.useWeapon);
  else if (card.type === 'weapon') result = equipWeapon(card);
  else result = drinkPotion(card);

  if (state.hp <= 0) {
    state.gameOver = true;
    state.outcome = 'lost';
    result.message += ' You died!';
    return result;
  }

  if (state.room.length === 1 && state.deck.length > 0) {
    const drawn = state.deck.splice(0, Math.min(3, state.deck.length));
    state.room.push(...drawn);
    state.potionUsedThisRoom = false; // new room = first potion heals again
    state.fledLastRoom = false; // completing a room normally resets the flee restriction
  }

  if (state.room.length === 0 && state.deck.length === 0) {
    state.gameOver = true;
    state.outcome = 'won';
    result.message += ' The dungeon is cleared — you win!';
  }

  return result;
}

/**
 * Flees the current room: only allowed on a full, untouched room (4 cards),
 * and not twice in a row. All 4 room cards go to the bottom of the deck and
 * a new room is dealt.
 */
function fleeRoom() {
  if (state.gameOver) return null;

  if (state.room.length !== 4) {
    return { message: "You can only flee a full room, before fighting anything in it." };
  }
  if (state.fledLastRoom) {
    return { message: "You can't flee two rooms in a row." };
  }

  state.deck.push(...state.room);
  state.room = state.deck.splice(0, Math.min(4, state.deck.length));
  state.fledLastRoom = true;
  state.potionUsedThisRoom = false;

  return { message: 'You fled the room — it was sent to the bottom of the deck.' };
}
