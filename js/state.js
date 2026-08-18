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
  gameOver: false,
  outcome: null,              // 'won' | 'lost' | null
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
  state.room = state.deck.splice(0, 4);
  state.equippedWeapon = null;
  state.weaponMaxMonster = null;
  state.potionUsedThisRoom = false;
  state.gameOver = false;
  state.outcome = null;
}

function fightMonster(card) {
  const weaponUsable =
    state.equippedWeapon &&
    (state.weaponMaxMonster === null || card.rank < state.weaponMaxMonster);

  let damage;
  if (weaponUsable) {
    damage = Math.max(card.rank - state.equippedWeapon.rank, 0);
    state.weaponMaxMonster = card.rank; // weapon degrades: only usable on weaker monsters from now on
  } else {
    damage = card.rank;
  }

  state.hp = Math.max(state.hp - damage, 0);

  const how = weaponUsable ? ` with your ${state.equippedWeapon.name}` : ' bare-handed';
  return { message: `Fought ${card.name}${how} — took ${damage} damage.` };
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
 * Returns a { message } result, or null if the card wasn't found / game over.
 */
function resolveCard(cardId) {
  if (state.gameOver) return null;

  const idx = state.room.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const [card] = state.room.splice(idx, 1);

  let result;
  if (card.type === 'monster') result = fightMonster(card);
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
  }

  if (state.room.length === 0 && state.deck.length === 0) {
    state.gameOver = true;
    state.outcome = 'won';
    result.message += ' The dungeon is cleared — you win!';
  }

  return result;
}
