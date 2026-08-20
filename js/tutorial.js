// ---------------------------------------------------------------------------
// Scoundrel, Tutorial (custom addition, not part of the original Scoundrel
// rules or an earlier version of this project).
//
// A guided, one-time walkthrough of a real (but fully pre-arranged) dungeon
// run. It reuses the actual game engine end to end, initGame()/resolveCard()/
// fightMonster()/fleeRoom()/useAbility() in js/state.js, the same click
// handlers and animations in js/main.js/js/ui.js, with two differences from
// a normal game: the deck is a fixed, hand-picked list of cards instead of a
// shuffle (see TUTORIAL_DECK_IDS/buildTutorialDeck() below, and initGame()'s
// `options.deck` param in js/state.js), and the champion is always fixed to
// Paladin (no champion-select screen) to keep the whole thing predictable,
// simpler to write, simpler to reason about, and one less choice for a
// brand-new player to make before they've even seen the game. There's no
// separate "tutorial game logic" anywhere, every rule demonstrated here is
// the exact same code path a real game uses.
//
// Entry point: the "Tutorial" button on the start screen (#tutorial-btn,
// wired at the bottom of this file), deliberately NOT auto-launched on
// first visit (no localStorage tracking); a player finds it the same way
// they'd find Champions/Weapons/Monsters/How to Play. It can be replayed any
// time, and "Skip Tutorial" (#tutorial-skip-btn, always visible while it
// runs) backs out at any point with no side effects on the real game state.
//
// How a step is "shown": each TUTORIAL_STEPS entry names either a room card
// (by id) or a persistent element (by DOM id) as its target. showTutorialStep()
// dims every other interactive element (body.tutorial-active in style.css)
// and layers .tutorial-target on just that one, which both restores its
// clickability (higher CSS specificity than the dimming rule) and gives it a
// pulsing gold outline. A small floating "coachmark" bubble with explanatory
// text is positioned next to it. The step advances itself once the target is
// actually clicked, a one-off listener attached directly to that element,
// completely separate from (and not modifying) the real click handlers in
// main.js, which fire and do the actual game logic exactly as they always do.
// A short delay (step.advanceDelayMs, hand-tuned per step to outlast whatever
// animation that particular action plays, a plain fade, a weapon-fly, a full
// weapon-swing, or a shield-shatter) is all that's needed before showing the
// next step, since by then the real re-render has already happened.
// ---------------------------------------------------------------------------

// The exact 17 cards used, in the exact order they're needed, picked (not
// randomly assigned effects, buildTutorialDeck() below forces effect: null
// on every one, and initGame() skips rollWeaponEffects() entirely for a
// scripted deck) so every fight's damage number is known ahead of time and
// the whole script can be hand-tuned to never actually kill the player. See
// the big comment block on TUTORIAL_STEPS below for the room-by-room math.
const TUTORIAL_DECK_IDS = [
  // Room 1: bare-handed fight, equip a weapon, fight with it, leave a potion.
  'spades-5', 'diamonds-6', 'clubs-9', 'hearts-8',
  // Room 2 refill: heal, potion-stacking cap, weapon-degrade rule, leave a shield.
  'hearts-3', 'clubs-11', 'shields-5',
  // Room 3 refill: equip shield, shield partially blocks, shield shatters.
  'spades-7', 'spades-10', 'diamonds-8',
  // Room 4 refill (filler, this room is fled whole, never resolved card by card).
  'clubs-4', 'hearts-2', 'diamonds-3',
  // Room 5, dealt fresh from the top of the deck after fleeing: heal, then
  // fight with the champion's active ability active. Last two are filler,
  // the tutorial ends before they'd ever be reached.
  'hearts-7', 'spades-9', 'diamonds-9', 'hearts-9',
];

function buildTutorialDeck() {
  return TUTORIAL_DECK_IDS.map((id) => ({ ...getCardById(id), effect: null }));
}

const tutorialState = {
  active: false,
  step: -1,
};

let tutorialTargetEl = null;

/**
 * Room-by-room walkthrough (all damage numbers below assume the fixed
 * Paladin champion and TUTORIAL_DECK_IDS above, see the deck comment for
 * which card is which):
 *   Room 1, fight bare-handed (no weapon yet), equip a weapon, fight again
 *     with it (damage = monster - weapon), leave the potion for next room.
 *   Room 2, drink the carried-over potion (heals), drink a second potion
 *     (doesn't, only the first per room heals), fight a monster stronger
 *     than the weapon's current limit (forces bare-handed, the degrade
 *     rule), leave the shield for next room.
 *   Room 3, equip the shield, fight a monster it partially blocks (shakes,
 *     survives), fight a harder one that breaks it (shatters), this is also
 *     the 5th monster defeated this game, so Paladin's passive heal fires
 *     too (shown via the normal fight message, no separate tutorial step
 *     needed for it).
 *   Room 4, flee the whole room instead of fighting (mana is granted for
 *     this, same as any room change).
 *   Room 5, drink a potion to top back up, then (mana force-filled here so
 *     the player doesn't have to grind out several more real room changes
 *     just to see this once) trigger the champion's active ability
 *     (Paladin's Blessing) and fight a monster to see it reduce the hit.
 */
const TUTORIAL_STEPS = [
  {
    targetType: 'info',
    text:
      "Welcome to Scoundrel! This short tutorial walks you through one real, pre-arranged dungeon run so you can see every rule in action. Click Start to begin.",
  },
  {
    targetType: 'card',
    targetKey: 'spades-5',
    text:
      "This is a Monster card. Its number is how much damage it deals. You have no weapon yet, so click it to fight bare-handed and take full damage.",
    advanceDelayMs: 600,
  },
  {
    targetType: 'card',
    targetKey: 'diamonds-6',
    text: "This is a Weapon card. Click it to equip it, it'll reduce damage from monsters you fight next.",
    advanceDelayMs: 700,
  },
  {
    targetType: 'card',
    targetKey: 'clubs-9',
    text:
      "Fight this monster with your weapon equipped: damage = monster strength minus weapon strength. Click it to see the difference.",
    advanceDelayMs: 1800,
  },
  {
    targetType: 'card',
    targetKey: 'hearts-8',
    text:
      "Only 3 of the 4 room cards get resolved each round. The 4th, like this Health Potion, carries into the next room. Click it to drink and heal HP.",
    advanceDelayMs: 600,
  },
  {
    targetType: 'card',
    targetKey: 'hearts-3',
    text: "Only the first potion in a room actually heals. This one won't, but it still needs to be resolved. Click it to see.",
    advanceDelayMs: 600,
  },
  {
    targetType: 'card',
    targetKey: 'clubs-11',
    text:
      "This monster (11) is stronger than the last one your weapon defeated (9), so the weapon can't be used on it, that's its wear rule. Click it to fight bare-handed.",
    advanceDelayMs: 600,
  },
  {
    targetType: 'card',
    targetKey: 'shields-5',
    text: "Shields are a third equippable item. Click to equip it, it'll block some incoming damage and has its own durability.",
    advanceDelayMs: 700,
  },
  {
    targetType: 'card',
    targetKey: 'spades-7',
    text: "Fight this one, your shield will absorb whatever damage still gets through after your weapon.",
    advanceDelayMs: 1800,
  },
  {
    targetType: 'card',
    targetKey: 'spades-10',
    text: "This hits harder than your shield has durability left, watch it shatter after blocking what it can.",
    advanceDelayMs: 900,
  },
  {
    targetType: 'element',
    targetKey: 'flee-btn',
    text: "You can avoid an entire room once, but not twice in a row. Click 'Flee Room' to send this whole room to the bottom of the deck.",
    advanceDelayMs: 400,
  },
  {
    targetType: 'card',
    targetKey: 'hearts-7',
    text: "Notice 'Flee Room' is now disabled. You can't flee two rooms in a row. For now, drink this potion to heal back up.",
    advanceDelayMs: 600,
  },
  {
    targetType: 'element',
    targetKey: 'ability-wrap',
    text:
      "Every champion has an active ability, powered by mana (the ring around this button) gained from clearing or fleeing rooms, filled early here so you can try it now. Paladin's Blessing reduces your next 3 hits by 3 damage each. Click to activate it.",
    advanceDelayMs: 400,
    before() {
      // Normally mana only fills gradually via gainMana() (js/state.js) as
      // rooms change. Forcing it straight to the cost here is a tutorial-
      // only shortcut so the player can try the ability within this one
      // scripted run, instead of needing several more real room changes.
      state.mana = abilityManaCostFor(state.champion);
      renderManaRing();
    },
  },
  {
    targetType: 'card',
    targetKey: 'spades-9',
    text: 'Now fight this monster. Blessing will cut the damage you take by 3.',
    advanceDelayMs: 600,
  },
  {
    targetType: 'info',
    isFinal: true,
    text:
      "That's the essentials: monsters, weapons and their wear, potions and their limit, shields, fleeing, and your champion's ability. You're ready, good luck in the real dungeon!",
  },
];

/** Positions #tutorial-coachmark just below `el` (or above it, if there's
 * not enough room below), clamped so it never runs off the left/right edge
 * of the viewport. Must be called after the coachmark is unhidden, a
 * display:none element measures 0x0. */
function positionCoachmarkNear(el) {
  const coachmark = document.getElementById('tutorial-coachmark');
  coachmark.style.transform = 'none';
  const rect = el.getBoundingClientRect();
  const cmRect = coachmark.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - cmRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - cmRect.width - 8));

  let top = rect.bottom + 12;
  if (top + cmRect.height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - cmRect.height - 12);
  }

  coachmark.style.left = `${left}px`;
  coachmark.style.top = `${top}px`;
}

/** Centers #tutorial-coachmark on screen, used for the info-only bookend
 * steps (welcome/finish), which have no specific element to point at. */
function positionCoachmarkCenter() {
  const coachmark = document.getElementById('tutorial-coachmark');
  coachmark.style.left = '50%';
  coachmark.style.top = '50%';
  coachmark.style.transform = 'translate(-50%, -50%)';
}

/** Shows TUTORIAL_STEPS[index], dims/undims the right elements, positions
 * the coachmark, and (for a 'card'/'element' step) arms a one-off click
 * listener on the target that advances to the next step once it's actually
 * clicked. Safe to call with an out-of-range index (ends the tutorial) or
 * while state.gameOver is somehow already true (shouldn't happen with the
 * hand-tuned script above, but this keeps a future retune from being able
 * to strand the tutorial mid-run on the real game-over banner). */
function showTutorialStep(index) {
  if (state.gameOver) {
    endTutorial();
    return;
  }

  const step = TUTORIAL_STEPS[index];
  if (!step) {
    endTutorial();
    return;
  }

  tutorialState.step = index;
  if (step.before) step.before();

  if (tutorialTargetEl) {
    tutorialTargetEl.classList.remove('tutorial-target');
    tutorialTargetEl = null;
  }

  const coachmark = document.getElementById('tutorial-coachmark');
  const nextBtn = document.getElementById('tutorial-next-btn');
  document.getElementById('tutorial-coachmark-text').textContent = step.text;
  coachmark.classList.remove('hidden');

  if (step.targetType === 'info') {
    nextBtn.textContent = step.isFinal ? 'Finish' : index === 0 ? 'Start Tutorial' : 'Next';
    nextBtn.classList.remove('hidden');
    positionCoachmarkCenter();
    return;
  }

  nextBtn.classList.add('hidden');

  const targetEl =
    step.targetType === 'card'
      ? document.querySelector(`.card[data-id="${step.targetKey}"]`)
      : document.getElementById(step.targetKey);

  if (!targetEl) {
    // Scripted deck/step desync safety net, should never happen given the
    // hand-verified script above, but ending the tutorial cleanly beats
    // leaving the player stuck on a coachmark pointing at nothing.
    endTutorial();
    return;
  }

  targetEl.classList.add('tutorial-target');
  tutorialTargetEl = targetEl;
  positionCoachmarkNear(targetEl);

  targetEl.addEventListener(
    'click',
    () => {
      setTimeout(() => showTutorialStep(index + 1), step.advanceDelayMs);
    },
    { once: true }
  );
}

/** Starts the tutorial: same shared entry point as any real game
 * (startNewGame() in js/main.js), just fixed to the Paladin champion and the
 * scripted deck above instead of a champion-select screen and a shuffle. */
function startTutorial() {
  startNewGame('paladin', { deck: buildTutorialDeck() });

  tutorialState.active = true;
  document.body.classList.add('tutorial-active');
  document.getElementById('tutorial-skip-btn').classList.remove('hidden');

  showTutorialStep(0);
}

/** Ends the tutorial at any point (finished, skipped, or the safety-net
 * cases in showTutorialStep() above) and returns to the start screen, the
 * scripted run's state is simply abandoned, same as leaving a real game
 * mid-run via "Main Menu" already does. */
function endTutorial() {
  tutorialState.active = false;
  tutorialState.step = -1;

  document.body.classList.remove('tutorial-active');
  document.getElementById('tutorial-skip-btn').classList.add('hidden');
  document.getElementById('tutorial-coachmark').classList.add('hidden');
  if (tutorialTargetEl) {
    tutorialTargetEl.classList.remove('tutorial-target');
    tutorialTargetEl = null;
  }

  showStartScreen();
}

document.getElementById('tutorial-btn').addEventListener('click', startTutorial);
document.getElementById('tutorial-skip-btn').addEventListener('click', endTutorial);
document.getElementById('tutorial-next-btn').addEventListener('click', () => {
  const step = TUTORIAL_STEPS[tutorialState.step];
  if (step && step.isFinal) {
    endTutorial();
  } else {
    showTutorialStep(tutorialState.step + 1);
  }
});

// #menu-btn stays clickable during the tutorial (see the CSS exemption in
// style.css) specifically so its "Back to Menu" button works as another way
// out, same as #tutorial-skip-btn. Both listeners below just end the
// tutorial in addition to whatever main.js's own listener on the same
// button already does (closeMenu()/showStartScreen(), or opening
// champion-select) — without this, leaving via the menu would abandon the
// scripted run but leave body.tutorial-active (and the coachmark/skip
// button) stuck on, dimming a real game started right after.
document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  if (tutorialState.active) endTutorial();
});
document.getElementById('new-game-btn').addEventListener('click', () => {
  if (tutorialState.active) endTutorial();
});
