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
  potionsDrunkThisRoom: 0,   // how many potions actually healed this room so
                              // far — normally only the first does (see
                              // drinkPotion()), but the Herbalist champion
                              // raises that cap to two
  fleeStreak: 0,              // consecutive rooms fled in a row — normally
                              // capped at 1 (see fleeRoom()), but the Rogue
                              // champion raises that cap to two
  gameOver: false,
  outcome: null,              // 'won' | 'lost' | null

  // Chosen once per game on the champion-select screen (see
  // openChampionSelect() in js/main.js) — an id from CHAMPIONS (js/
  // champion-icons.js), or null before a champion has ever been picked.
  // Each passive is applied inline, gated on this id, in fightMonster()/
  // drinkPotion()/fleeRoom() below.
  champion: null,
  monstersDefeated: 0,       // total monsters fought this game — drives the
                              // Paladin champion's "every 5th kill" heal

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

/** @param championId - id of the champion picked on the champion-select
 * screen (see js/champion-icons.js), or undefined/null to start without one
 * (kept optional so callers/tests that don't care about champions still
 * work). */
function initGame(championId = null) {
  state.hp = state.maxHp;
  state.deck = shuffle(getFreshDeck());
  rollWeaponEffects(state.deck); // 25% chance per weapon, re-rolled every game
  state.room = state.deck.splice(0, 4);
  state.equippedWeapon = null;
  state.weaponMaxMonster = null;
  state.potionsDrunkThisRoom = 0;
  state.fleeStreak = 0;
  state.gameOver = false;
  state.outcome = null;
  state.champion = championId;
  state.monstersDefeated = 0;
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

  // Ids of monsters weakened this fight (currently only via Electric) — the
  // caller (main.js) uses this to play a "-1" + shake on those cards.
  const weakenedIds = [];

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
        if (roomCard.type === 'monster') {
          weakenMonster(roomCard);
          weakenedIds.push(roomCard.id);
        }
      });
    }
  } else {
    damage = card.rank;
    // Berserker champion: 2 less damage from every monster fought
    // bare-handed (never below 0).
    if (state.champion === 'berserker') damage = Math.max(damage - 2, 0);
  }

  state.hp = Math.max(state.hp - damage, 0);

  // Paladin champion: every 5th monster defeated this game heals 3 HP.
  // Counted here (rather than in resolveCard) since this is the one place
  // both weapon and bare-handed fights funnel through, and a monster is
  // always "defeated" once its card resolves — there's no monster HP to
  // track separately.
  let paladinHeal = 0;
  // True on the exact kill that completes a 5-kill cycle, even if the heal
  // itself was capped to 0 HP by an already-full health bar — the ability
  // bar (see renderChampionAbilityBar() in ui.js) still plays its "full,
  // then drain" animation on the milestone kill either way.
  let paladinCycleComplete = false;
  if (state.champion === 'paladin') {
    state.monstersDefeated += 1;
    if (state.monstersDefeated % 5 === 0) {
      paladinCycleComplete = true;
      const hpBefore = state.hp;
      state.hp = Math.min(state.hp + 3, state.maxHp);
      paladinHeal = state.hp - hpBefore;
    }
  }

  let message;
  // Show flavor names (e.g. "Shadow Assassin", "Mjölnir"), never raw poker
  // card names (e.g. "8 of Clubs", "9 of Diamonds"), in the fight log.
  // Monster lookup uses baseRank so a weakened monster (see
  // weakenMonster()) still shows the right creature.
  const monsterLabel = monsterNameFor(card.baseRank) || card.name;
  const weaponLabel = weaponUsable ? weaponNameFor(weapon.baseRank) || weapon.name : null;
  const how = weaponUsable ? ` with your ${weaponLabel}` : ' bare-handed';
  if (weaponUsable && weapon.effect === 'vampiric') {
    state.hp = Math.min(state.hp + 1, state.maxHp);
    message = `Fought ${monsterLabel}${how} — took ${damage} damage. Vampiric weapon healed 1 HP.`;
  } else if (weaponUsable && weapon.effect === 'electric') {
    message = `Fought ${monsterLabel}${how} — took ${damage} damage. Electric surge weakened the other monsters!`;
  } else {
    message = `Fought ${monsterLabel}${how} — took ${damage} damage.`;
  }
  if (paladinHeal > 0) {
    message += ` Paladin's faith healed ${paladinHeal} HP.`;
  }

  return { message, weakenedIds, paladinCycleComplete };
}

function equipWeapon(card) {
  state.equippedWeapon = card;
  state.weaponMaxMonster = null; // fresh weapon: no restriction until first use
  const weaponLabel = weaponNameFor(card.baseRank) || card.name;
  return { message: `Equipped ${weaponLabel}.` };
}

function drinkPotion(card) {
  // Normally only the first potion in a room heals; the Herbalist champion
  // raises that cap to two.
  const potionLabel = potionNameFor(card.baseRank) || card.name;
  const maxHealingPotions = state.champion === 'herbalist' ? 2 : 1;
  if (state.potionsDrunkThisRoom >= maxHealingPotions) {
    return { message: `Drank ${potionLabel} — already healed this room, no effect.` };
  }
  const healed = Math.min(card.rank, state.maxHp - state.hp);
  state.hp += healed;
  state.potionsDrunkThisRoom += 1;
  return { message: `Drank ${potionLabel} — healed ${healed} HP.` };
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
    state.potionsDrunkThisRoom = 0; // new room = potion(s) can heal again
    state.fleeStreak = 0; // completing a room normally resets the flee streak
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

  // Normally you can't flee two rooms in a row; the Rogue champion raises
  // that cap to two rooms in a row (i.e. a third flee back-to-back is
  // still disallowed).
  const maxFleeStreak = state.champion === 'rogue' ? 2 : 1;
  if (state.fleeStreak >= maxFleeStreak) {
    return {
      message:
        maxFleeStreak > 1
          ? "You can't flee three rooms in a row."
          : "You can't flee two rooms in a row.",
    };
  }

  state.deck.push(...state.room);
  state.room = state.deck.splice(0, Math.min(4, state.deck.length));
  state.fleeStreak += 1;
  state.potionsDrunkThisRoom = 0;

  return { message: 'You fled the room — it was sent to the bottom of the deck.' };
}
