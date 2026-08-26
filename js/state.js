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
  weaponFragileUsesRemaining: null, // null unless the equipped weapon has the
                              // Fragile effect (see js/weapon-effects.js),
                              // in which case it starts at FRAGILE_MAX_USES
                              // and counts down by 1 every time the weapon
                              // is actually used in a fight (see
                              // fightMonster() below); once it hits 0 the
                              // weapon breaks. Reset by equipWeapon()
                              // whenever a new weapon is equipped.
  equippedShield: null,      // card object, or null — custom addition (see
                              // "Shields" in js/cards.js). Clicking one
                              // equips it (equipShield() below) the same way
                              // a weapon does. Its `rank` is both how much
                              // damage it blocks per fight and its
                              // remaining durability — see the shield-block
                              // logic in fightMonster() below; it unequips
                              // itself once that reaches 0.
  potionsDrunkThisRoom: 0,   // how many potions actually healed this room so
                              // far — normally only the first does (see
                              // drinkPotion()), but the Herbalist champion
                              // raises that cap to two
  fleeStreak: 0,              // consecutive rooms fled in a row — normally
                              // capped at 1 (see fleeRoom()), but the Rogue
                              // champion raises that cap to two
  roomsDealt: 0,               // how many rooms have been dealt so far this
                              // game (the initial room counts as 1, every
                              // refill/flee-redeal adds 1) — drives the
                              // "safe start" rule in drawForRoom() below,
                              // which only applies while this is below
                              // SAFE_ROOM_LIMIT
  scriptedDeck: false,        // true only for the Tutorial's fixed,
                              // hand-ordered deck (see initGame()'s
                              // options.deck) — drawForRoom() below must
                              // never reshuffle a scripted deck, or it would
                              // break the tutorial's hand-verified sequence
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
  mana: 0,                    // resource for the champion's active ability
                              // (see "Champion Active Abilities" in
                              // CLAUDE.md) — gained via gainMana() below
                              // whenever a room changes (cleared or fled),
                              // spent (reset to 0) via useAbility(). Always
                              // clamped to the current champion's
                              // ABILITY_MANA_COST (js/ability-icons.js), so
                              // it can be read directly as "progress toward
                              // the ability being usable" without a caller
                              // having to clamp it themselves.
  paladinResistCharges: 0,    // Paladin's active ability: set to 3 by
                              // useAbility() below, then counts down by 1
                              // each of the next 3 times he'd take damage
                              // (see fightMonster()), reducing that hit by
                              // 2 (min 0) each time. 0 = ability inactive —
                              // renderAbilityActiveGlow() (js/ui.js) reads
                              // this directly to show/hide the button's
                              // golden "still active" glow.
  rogueTargeting: false,      // Rogue's active ability ("Backstab") needs a
                              // target — useAbility() sets this true instead
                              // of spending mana right away, which arms
                              // targeting mode (renderRogueTargeting() in
                              // js/ui.js wiggles every monster in the room
                              // and shows the ✕ cancel badge). Mana is only
                              // actually spent once a monster is clicked
                              // (resolveBackstab() below) — canceling
                              // (cancelBackstab()) costs nothing, so the
                              // ability stays saved for later.
  berserkerFrenzyCharges: 0,  // Berserker's active ability ("Frenzy"): set to
                              // 4 by useAbility() below. While > 0, the
                              // equipped weapon ignores weaponMaxMonster (the
                              // "only usable on a monster weaker than the
                              // last one it defeated" degrade rule) entirely
                              // — see isWeaponUsableOn() below — so a
                              // degraded weapon can strike anything again.
                              // Counts down by 1 on every one of the next 4
                              // weapon fights, whether or not the override
                              // was actually needed that fight (see the
                              // gotcha comment in fightMonster() — an
                              // earlier "only spend it when it mattered"
                              // version could get the counter stuck for a
                              // long time, since a frenzied kill of a
                              // strong monster raises weaponMaxMonster high
                              // enough that the restriction stops engaging
                              // for a while afterward). 0 = ability inactive
                              // — renderAbilityActiveGlow() (js/ui.js) reads
                              // this directly, same pattern as Paladin's
                              // paladinResistCharges (a different system —
                              // this lifts a restriction rather than
                              // reducing damage — deliberately, so the two
                              // abilities don't feel like reskins of the
                              // same mechanic).

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

/** Custom addition, not part of the original Scoundrel rules: how many
 * rooms (see state.roomsDealt above) get the "no unfair start" treatment in
 * drawForRoom() below. Room 1 and room 2 are protected; from room 3 onward
 * the deck is fully unconstrained, exactly as it was before this feature
 * existed. */
const SAFE_ROOM_LIMIT = 2;

/** True unless every card in a room is the same type — the specific
 * "unfair instant death" shape drawForRoom() below exists to rule out: 4
 * fresh monsters with no weapon or potion to fall back on (and if it
 * happens two rooms running, no way to flee a second time either, since
 * fleeing twice in a row isn't normally allowed). A room of 4 weapons or 4
 * potions isn't dangerous the same way, but is equally called out by the
 * design brief as an unsatisfying way to open a run, so it's excluded too.
 * Cards.length < 4 (the tail end of the deck) is always considered safe —
 * nothing left to reshuffle into a better shape anyway. */
function isRoomTypeSafe(cards) {
  if (cards.length < 4) return true;
  return !cards.every((c) => c.type === cards[0].type);
}

/** Draws `needed` cards for the next room from the front of state.deck,
 * combining them with whatever `existingCards` are already going to be in
 * that room (e.g. the one leftover card carried over from the previous
 * room, or nothing for a fresh/fled room). For the first SAFE_ROOM_LIMIT
 * rooms of a real (non-tutorial) game, this rejects and reshuffles the
 * as-yet-undealt part of the deck until the resulting room isn't monotype
 * (see isRoomTypeSafe() above) before actually drawing.
 *
 * This is rejection sampling, not a scripted or rigged deck: every attempt
 * is a full, fair Fisher–Yates shuffle, so the result stays completely
 * random and unpredictable — it only excludes the narrow slice of outcomes
 * that would otherwise let sheer bad luck end (or badly cripple) a run
 * before the player has any weapon, potion, or second flee to fall back
 * on. Deck composition and overall difficulty are unaffected either way;
 * only the order of the first couple of rooms is nudged, and only away
 * from that one specific shape.
 *
 * `protectedTailCount` excludes that many cards at the very end of
 * state.deck from the reshuffle — used when a room was just fled (pushed
 * to the bottom of the deck, see fleeRoom() below): those specific cards
 * must stay put at the bottom, or reshuffling the whole deck could pull
 * one straight back out again in the very next room, breaking the "fled
 * cards go to the bottom" guarantee players rely on. */
function drawForRoom(existingCards, needed, protectedTailCount = 0) {
  const drawCount = Math.min(needed, state.deck.length);
  const skipSafety = state.scriptedDeck || state.roomsDealt >= SAFE_ROOM_LIMIT;

  if (!skipSafety && drawCount > 0) {
    const shuffleEnd = state.deck.length - protectedTailCount;
    let attempts = 0;
    let candidate;
    do {
      const reshuffled = shuffle(state.deck.slice(0, shuffleEnd));
      state.deck = [...reshuffled, ...state.deck.slice(shuffleEnd)];
      candidate = state.deck.slice(0, drawCount);
      attempts++;
    } while (!isRoomTypeSafe([...existingCards, ...candidate]) && attempts < 100);
  }

  return state.deck.splice(0, drawCount);
}

/** @param championId - id of the champion picked on the champion-select
 * screen (see js/champion-icons.js), or undefined/null to start without one
 * (kept optional so callers/tests that don't care about champions still
 * work).
 * @param options.deck - an already-ordered array of full card objects to use
 * verbatim instead of a fresh shuffled deck. Used only by the Tutorial (see
 * js/tutorial.js's buildTutorialDeck()), which needs the exact same cards in
 * the exact same order every run so its scripted coachmark steps always line
 * up with what's actually in the room. Weapon effects are never rolled for a
 * scripted deck (tutorial cards already have effect: null set explicitly) —
 * a random Vampiric/Electric/Sturdy roll would throw off its hand-tuned
 * damage numbers. */
function initGame(championId = null, options = {}) {
  state.hp = state.maxHp;
  state.scriptedDeck = !!options.deck;
  if (options.deck) {
    state.deck = [...options.deck];
  } else {
    state.deck = shuffle(getFreshDeck());
    rollWeaponEffects(state.deck); // 25% chance per weapon, re-rolled every game
  }
  state.roomsDealt = 0;
  state.room = drawForRoom([], 4);
  state.roomsDealt = 1;
  state.equippedWeapon = null;
  state.weaponMaxMonster = null;
  state.weaponFragileUsesRemaining = null;
  state.equippedShield = null;
  state.potionsDrunkThisRoom = 0;
  state.fleeStreak = 0;
  state.gameOver = false;
  state.outcome = null;
  state.champion = championId;
  state.monstersDefeated = 0;
  state.mana = 0;
  state.paladinResistCharges = 0;
  state.rogueTargeting = false;
  state.berserkerFrenzyCharges = 0;
}

/** Called whenever the room changes — a room clearing (refilling back up to
 * 4 cards) or a successful flee, see the call sites in resolveCard()/
 * fleeRoom() below — to grow the champion's active-ability mana by 1.
 * Clamped to the champion's ABILITY_MANA_COST (js/ability-icons.js) since
 * nothing reads mana past that point anyway (the ability just becomes
 * usable and stays usable until spent — see useAbility() below), which also
 * means callers can treat state.mana directly as "progress toward ready"
 * without re-clamping it themselves (see abilityManaProgress() in
 * js/ui.js). No-ops before a champion is picked. */
function gainMana() {
  if (!state.champion) return;
  const cost = abilityManaCostFor(state.champion);
  state.mana = Math.min(state.mana + 1, cost);
}

/** Spends all collected mana to activate the current champion's active
 * ability, once ABILITY_MANA_COST has been reached — returns null (and
 * leaves state.mana untouched) if there isn't enough yet, if the game is
 * over, or if no champion is set, so the caller knows nothing happened.
 * All four champions' abilities are implemented (see "Champion Active
 * Abilities" in CLAUDE.md) — their actual effects live wherever in
 * state.js they're relevant, gated on state.champion, mirroring how the
 * passives are done inline in fightMonster()/drinkPotion()/fleeRoom().
 * @returns {message, healed, targeting} — `healed` is the actual HP
 *   restored by an ability that heals (0/undefined for one that doesn't);
 *   `targeting` is true only for Rogue's Backstab arming itself (see
 *   below) rather than actually resolving. Callers like the ability-button
 *   click handler in js/main.js react to these generically (HP-delta
 *   feedback + showAbilityHealBurst() for `healed`, renderRogueTargeting()
 *   for `targeting`) without needing to know which champion did it — same
 *   "return a flag, let the UI react generically" pattern as
 *   fightMonster()'s weakenedIds/shieldBlocked. */
function useAbility() {
  if (state.gameOver || !state.champion) return null;
  const cost = abilityManaCostFor(state.champion);
  if (state.mana < cost) return null;
  const champ = championById(state.champion);

  // Rogue's Backstab needs a target (a monster in the room, see
  // resolveBackstab() below), so activating it doesn't spend mana or do
  // anything to the room yet — it just arms targeting mode. Mana is only
  // actually spent once a monster is chosen; canceling (cancelBackstab())
  // costs nothing, so the ability stays saved for later. A second click of
  // the ability button while already armed is a no-op — the ✕ badge
  // (renderRogueTargeting() in js/ui.js) is the only way to back out.
  if (state.champion === 'rogue') {
    if (state.rogueTargeting) return null;
    state.rogueTargeting = true;
    return { message: `${champ.name} readies a Backstab — choose a monster to strike.`, targeting: true };
  }

  state.mana = 0;

  if (state.champion === 'paladin') {
    // See paladinResistCharges in the state object above and the damage
    // reduction in fightMonster() below.
    state.paladinResistCharges = 3;
    return { message: `${champ.name} calls down a blessing — the next 3 hits deal 2 less damage.` };
  }

  if (state.champion === 'herbalist') {
    const healed = Math.min(5, state.maxHp - state.hp);
    state.hp += healed;
    const message =
      healed > 0
        ? `${champ.name} channels nature's grace — healed ${healed} HP.`
        : `${champ.name} channels nature's grace — already at full health, no effect.`;
    return { message, healed };
  }

  if (state.champion === 'berserker') {
    // See berserkerFrenzyCharges in the state object above and
    // isWeaponUsableOn()/fightMonster() below.
    state.berserkerFrenzyCharges = 4;
    return { message: `${champ.name} flies into a frenzy — the weapon ignores its degrade limit for the next 4 fights.` };
  }

  return { message: `${champ.name}'s ability isn't implemented yet — mana spent.` };
}

/** Backs out of Rogue's Backstab targeting mode (armed by useAbility()
 * above) without spending any mana — the ability stays fully charged and
 * ready to use later. No-ops (returns null) if targeting wasn't active. */
function cancelBackstab() {
  if (!state.rogueTargeting) return null;
  state.rogueTargeting = false;
  return { message: 'Backstab cancelled.' };
}

/** Resolves Rogue's Backstab once a monster has actually been chosen (see
 * the room-click handling in js/main.js, which only calls this for a
 * monster-type card while state.rogueTargeting is true) — deals 6 damage
 * to that monster via weakenMonster() (same "reduce rank, floor at 1,
 * identity unchanged" behavior as the Electric weapon effect, just -6
 * instead of -1: strong enough to cripple almost anything, but Backstab
 * alone never removes a monster from the room outright). Spends the mana
 * and turns off targeting mode either way. Returns null if targeting
 * wasn't active or the card isn't actually in the room as a monster, so a
 * stale/mistargeted click is a no-op. */
function resolveBackstab(cardId) {
  if (!state.rogueTargeting) return null;
  const card = state.room.find((c) => c.id === cardId && c.type === 'monster');
  if (!card) return null;

  state.rogueTargeting = false;
  state.mana = 0;

  const champ = championById(state.champion);
  const monsterLabel = monsterNameFor(card.baseRank) || card.name;
  weakenMonster(card, 6);

  return { message: `${champ.name} backstabs ${monsterLabel} for 6 damage!`, cardId };
}

/** Whether the equipped weapon may currently be used against this monster
 * (ignoring player choice — just whether the rules allow it at all).
 * Normally gated by weaponMaxMonster (the "only usable on a monster weaker
 * than the last one it defeated" degrade rule) — Berserker's active
 * ability ("Frenzy", see useAbility() above) lifts that restriction
 * entirely while berserkerFrenzyCharges > 0, so a degraded weapon can
 * strike anything again. */
function isWeaponUsableOn(card) {
  const frenzied = state.champion === 'berserker' && state.berserkerFrenzyCharges > 0;
  return (
    !!state.equippedWeapon &&
    (frenzied || state.weaponMaxMonster === null || card.rank < state.weaponMaxMonster)
  );
}

/** Lowers a monster's rank by `amount` (default 1, min 1 — this never
 * outright kills/removes it, however high `amount` is), keeping its
 * identity (artwork, flavor name — both keyed off `baseRank`, not `rank`)
 * but updating its displayed label/name so messages/tooltips stay
 * consistent with the new, weaker value. Used by the Electric weapon
 * effect (amount 1) and Rogue's Backstab ability (amount 6, see
 * resolveBackstab() below). */
function weakenMonster(card, amount = 1) {
  card.rank = Math.max(1, card.rank - amount);
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

  // Whether Berserker's Frenzy (see isWeaponUsableOn() above) is active for
  // this weapon fight. Computed from weaponMaxMonster BEFORE it gets
  // overwritten below, purely to decide the flavor text (did the degrade
  // rule actually need overriding this time, or was the weapon already
  // legal anyway?) — the charge itself always ticks down on the next 3
  // weapon fights, whether or not it was actually needed each time (see the
  // gotcha below for why "only spend it when it matters" doesn't work).
  const frenzyActive =
    weaponUsable && state.champion === 'berserker' && state.berserkerFrenzyCharges > 0;
  const frenzyOverrode =
    frenzyActive && state.weaponMaxMonster !== null && card.rank >= state.weaponMaxMonster;

  // Ids of monsters weakened this fight (currently only via Electric) — the
  // caller (main.js) uses this to play a "-1" + shake on those cards.
  const weakenedIds = [];

  let damage;
  if (weaponUsable) {
    damage = Math.max(card.rank - weapon.rank, 0);

    // GOTCHA: an earlier version only decremented berserkerFrenzyCharges
    // when frenzyOverrode was true (i.e. only on a fight the restriction
    // would otherwise have blocked). That trapped the counter: the very
    // first frenzied kill of a strong monster raises weaponMaxMonster (the
    // ceiling, set below) up to that monster's rank, which then makes the
    // weapon legally usable on almost everything for a long stretch
    // afterward — so the restriction stops engaging, the remaining
    // charge(s) never get spent, and the button/status line sits stuck on
    // e.g. "1 left" indefinitely while the player keeps fighting freely.
    // Always spending a charge on every weapon fight while Frenzy is active
    // (regardless of whether it was needed) makes it a plain, predictable
    // "next 4 weapon fights" counter instead — matching how Paladin's/
    // Berserker's other counters behave. Don't reintroduce the
    // "only-if-it-mattered" version.
    if (frenzyActive) state.berserkerFrenzyCharges -= 1;

    // Weapon degrade: normally the weapon can only be used again on a
    // monster weaker than the one it just defeated. Sturdy limits how far
    // that usable-strength ceiling can drop in one fight (max -2) instead
    // of dropping straight to the defeated monster's value. Frenzy only
    // lifts the *restriction* for this swing — the ceiling itself still
    // updates normally afterward, so a later, non-Frenzied swing still
    // respects the degrade rule.
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

    // Fragile: counts down every time the weapon is actually used, no
    // matter which monster or how the fight otherwise went; reaching 0
    // means it breaks. The weapon stays equipped (at 0 uses) for the rest
    // of this fight; the caller only actually unequips it and plays the
    // shatter animation once the weapon-attack swing has fully returned to
    // the slot (see breakFragileWeapon() above for why).
    if (weapon.effect === 'fragile') {
      state.weaponFragileUsesRemaining -= 1;
    }
  } else {
    damage = card.rank;
    // Berserker champion: 2 less damage from every monster fought
    // bare-handed (never below 0).
    if (state.champion === 'berserker') damage = Math.max(damage - 2, 0);
  }

  // Paladin's active ability (see useAbility() above): the next 3 times he
  // would take damage — weapon or bare-handed, doesn't matter, this runs
  // after both branches above — each hit is reduced by 2 (never below 0)
  // and burns one charge. Applied before the shield block below, same spot
  // Berserker's passive reduction lands, so a shield only ever blocks
  // whatever damage is still left after every other reduction. Only counts
  // as one of the 3 "times he'd take damage" if there was actually damage
  // to reduce — a hit already fully stopped by the weapon doesn't burn a
  // charge for nothing.
  let paladinResisted = false;
  if (state.champion === 'paladin' && state.paladinResistCharges > 0 && damage > 0) {
    damage = Math.max(damage - 2, 0);
    state.paladinResistCharges -= 1;
    paladinResisted = true;
  }

  // Shield block: applies to whatever damage is left after the weapon (or
  // Berserker) has already reduced it — a shield never blocks damage the
  // weapon already stopped, only what actually gets through. A shield's
  // `rank` doubles as its remaining durability: every point of damage it
  // blocks permanently lowers it by that much (same "rank is current
  // strength, baseRank is identity" pattern as weakenMonster() above), and
  // it shatters (unequips) once that hits 0. Captured as `shieldBefore`
  // before possibly clearing state.equippedShield, so the fight message
  // below can still name the shield that just broke.
  const shieldBefore = state.equippedShield;
  let blocked = 0;
  let shieldBroke = false;
  if (shieldBefore) {
    blocked = Math.min(damage, shieldBefore.rank);
    damage -= blocked;
    shieldBefore.rank -= blocked;
    shieldBefore.label = RANK_LABELS[shieldBefore.rank] || String(shieldBefore.rank);
    shieldBefore.name = `${shieldBefore.label} of ${capitalize(shieldBefore.suit)}`;
    if (shieldBefore.rank <= 0) {
      shieldBroke = true;
      state.equippedShield = null;
    }
  }

  state.hp = Math.max(state.hp - damage, 0);

  // Paladin champion: every 5th monster defeated this game heals 2 HP.
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
      state.hp = Math.min(state.hp + 2, state.maxHp);
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
  // Vampiric only heals if the weapon actually defeated the monster within
  // its normal degrade limit — true on a fresh weapon's first swing
  // (weaponMaxMonster was null, so any monster counts as "under the limit"),
  // and true afterward only while card.rank is still below weaponMaxMonster.
  // Berserker's Frenzy can make weaponUsable true even when the monster is
  // AT or ABOVE that limit (frenzyOverrode) — that swing must not heal.
  // Also never heal on a lethal hit: state.hp was already clamped to 0
  // above, and healing after death let the player survive every fight at
  // 1 HP forever (the vampiric-immortality bug) — gate on state.hp > 0.
  const vampiricHeals =
    weaponUsable && weapon.effect === 'vampiric' && !frenzyOverrode && state.hp > 0;
  // True the instant a Fragile weapon's uses reach 0 on this fight. See
  // breakFragileWeapon() above for why this only *reports* the break rather
  // than unequipping the weapon here directly.
  const weaponBroke = weaponUsable && weapon.effect === 'fragile' && state.weaponFragileUsesRemaining <= 0;
  if (vampiricHeals) {
    state.hp = Math.min(state.hp + 1, state.maxHp);
    message = `Fought ${monsterLabel}${how} — took ${damage} damage. Vampiric weapon healed 1 HP.`;
  } else if (weaponUsable && weapon.effect === 'electric') {
    message = `Fought ${monsterLabel}${how} — took ${damage} damage. Electric surge weakened the other monsters!`;
  } else {
    message = `Fought ${monsterLabel}${how} — took ${damage} damage.`;
  }
  if (weaponUsable && weapon.effect === 'fragile') {
    message += weaponBroke
      ? ` Your fragile ${weaponLabel} shatters!`
      : ` Your fragile ${weaponLabel} is cracking (${state.weaponFragileUsesRemaining} use${state.weaponFragileUsesRemaining === 1 ? '' : 's'} left).`;
  }
  if (paladinHeal > 0) {
    message += ` Paladin's faith healed ${paladinHeal} HP.`;
  }
  if (paladinResisted) {
    message +=
      state.paladinResistCharges > 0
        ? ` Blessing absorbed 2 damage (${state.paladinResistCharges} left).`
        : ' Blessing absorbed 2 damage — it has faded.';
  }
  if (frenzyActive) {
    const left = state.berserkerFrenzyCharges;
    if (frenzyOverrode) {
      message += left > 0
        ? ` Frenzy overpowered the weapon's limit (${left} left).`
        : " Frenzy overpowered the weapon's limit — it has faded.";
    } else {
      message += left > 0
        ? ` Frenzy is active (${left} left).`
        : ' Frenzy has faded.';
    }
  }
  if (blocked > 0) {
    const shieldLabel = shieldNameFor(shieldBefore.baseRank) || shieldBefore.name;
    message += shieldBroke
      ? ` Your ${shieldLabel} blocked ${blocked} damage and shattered!`
      : ` Your ${shieldLabel} blocked ${blocked} damage.`;
  }

  // shieldBlocked/shieldBroke let the caller (applyResolve() in js/main.js)
  // play the shield's shake/shatter feedback (see animateShieldShake()/
  // animateShieldShatter() in js/ui.js) without having to re-derive whether
  // a shield was involved from the before/after state itself.
  return { message, weakenedIds, paladinCycleComplete, shieldBlocked: blocked > 0, shieldBroke, weaponBroke };
}

function equipWeapon(card) {
  state.equippedWeapon = card;
  state.weaponMaxMonster = null; // fresh weapon: no restriction until first use
  // Fragile: starts at full uses on every fresh equip, even if the card
  // being replaced was itself Fragile and partway through breaking.
  // Equipping a new weapon always discards the old one's condition too, same
  // as everything else about the old weapon (see fightMonster() below for
  // where this counts down, and breakFragileWeapon() for what happens at 0).
  state.weaponFragileUsesRemaining = card.effect === 'fragile' ? FRAGILE_MAX_USES : null;
  const weaponLabel = weaponNameFor(card.baseRank) || card.name;
  return { message: `Equipped ${weaponLabel}.` };
}

/** Actually breaks the currently-equipped Fragile weapon: unequips it and
 * clears its degrade ceiling/use counter, the same three fields a normal
 * "equip something else" swap would clear. Deliberately a separate function
 * from fightMonster() below rather than fightMonster() clearing the weapon
 * itself the instant its uses hit 0. The weapon-attack swing animation
 * (animateWeaponAttack() in js/ui.js) keeps flying the *real* weapon-slot
 * element out to the monster and back over ~1.5s, calling renderWeaponSlot()
 * partway through (at impact) while the element is still mid-flight; if the
 * weapon were already unequipped by then, that mid-flight re-render would
 * instantly swap the flying card face for the empty-slot icon, which reads
 * as the weapon vanishing before it's even swung back. So fightMonster()
 * only reports `weaponBroke: true` and leaves the weapon equipped (at 0
 * uses) for the rest of that swing; the caller (resolveAndAnimate() in
 * js/main.js) waits until the swing has fully returned, then calls this
 * function immediately before playing the shatter animation
 * (animateWeaponShatter() in js/ui.js) on the now-stationary slot. */
function breakFragileWeapon() {
  state.equippedWeapon = null;
  state.weaponMaxMonster = null;
  state.weaponFragileUsesRemaining = null;
}

/** Equips a shield card, the same way equipWeapon() equips a weapon. Its
 * `rank` then doubles as both the amount of damage it blocks per fight and
 * its remaining durability — see the shield-block logic in fightMonster()
 * above. Equipping a new shield discards whatever was equipped before,
 * same as weapons (no partial-durability carry-over). */
function equipShield(card) {
  state.equippedShield = card;
  const shieldLabel = shieldNameFor(card.baseRank) || card.name;
  return { message: `Equipped ${shieldLabel}.` };
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
  else if (card.type === 'shield') result = equipShield(card);
  else result = drinkPotion(card);

  if (state.hp <= 0) {
    state.gameOver = true;
    state.outcome = 'lost';
    result.message += ' You died!';
    return result;
  }

  // Win the moment no monster cards remain anywhere (deck or room) — once
  // every monster is dead, the leftover weapons/potions/shields have no
  // further purpose, so there's no reason to force the player to keep
  // clicking through them just to empty the deck.
  const monstersRemain =
    state.deck.some((c) => c.type === 'monster') ||
    state.room.some((c) => c.type === 'monster');
  if (!monstersRemain) {
    state.gameOver = true;
    state.outcome = 'won';
    result.message += ' All monsters defeated, the dungeon is cleared — you win!';
    return result;
  }

  if (state.room.length === 1 && state.deck.length > 0) {
    const drawn = drawForRoom(state.room, 3);
    state.room.push(...drawn);
    state.roomsDealt += 1; // see the "safe start" rule in drawForRoom() above
    state.potionsDrunkThisRoom = 0; // new room = potion(s) can heal again
    state.fleeStreak = 0; // completing a room normally resets the flee streak
    gainMana(); // room cleared — see gainMana() above
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

  const fledCount = state.room.length;
  state.deck.push(...state.room);
  state.room = drawForRoom([], 4, fledCount);
  state.roomsDealt += 1; // see the "safe start" rule in drawForRoom() above
  state.fleeStreak += 1;
  state.potionsDrunkThisRoom = 0;
  gainMana(); // room changed (fled) — see gainMana() above

  return { message: 'You fled the room — it was sent to the bottom of the deck.' };
}
