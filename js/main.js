// ---------------------------------------------------------------------------
// Scoundrel — wiring: connects clicks/buttons to state.js and triggers
// re-renders via ui.js.
// ---------------------------------------------------------------------------

// Keep in sync with the .card--resolved transition duration in style.css.
const CARD_ANIMATION_MS = 280;

// --- action queue -------------------------------------------------------------
// Every room-card click (fight/equip/drink) is routed through this queue so
// their animations never overlap or interleave — clicking rapidly used to
// look broken because a second click's state change (card gone, HP lost,
// weapon-slot updated) could land while the first click's animation was
// still mid-flight. Now a click's actual effect only ever happens once its
// own animation has fully played out, and the next queued click only starts
// once that happens.
//
// So the queue doesn't feel sluggish, a click that arrives while a previous
// one is still animating doesn't jump the queue or cut the current animation
// short — instead the *currently playing* animation is nudged to finish at
// double speed (see speedUpCurrentAction below; each animation's own
// speedUp() controller, from ui.js, makes sure this never causes a visual
// jump). Further clicks while it's already sped up don't stack — a swing
// only ever goes up to 2x.
const actionQueue = [];
let queueBusy = false;
let speedUpCurrentAction = null;

/** Queues `run` to execute once every action ahead of it has finished.
 * `run(registerSpeedUp, onFinished)` — the action calls `registerSpeedUp`
 * with whatever function should currently fast-forward it (an action with
 * multiple animation legs may call this more than once, to hand over the
 * baton as it moves from one leg to the next), and must call `onFinished()`
 * itself once its animation and every resulting state/UI change is
 * completely done. */
function enqueueRoomAction(run) {
  actionQueue.push(run);
  if (queueBusy) {
    if (speedUpCurrentAction) speedUpCurrentAction();
  } else {
    runNextQueuedAction();
  }
}

function runNextQueuedAction() {
  const run = actionQueue.shift();
  if (!run) {
    queueBusy = false;
    speedUpCurrentAction = null;
    return;
  }
  queueBusy = true;
  speedUpCurrentAction = null;
  run(
    (speedUpFn) => {
      speedUpCurrentAction = speedUpFn;
    },
    () => {
      speedUpCurrentAction = null;
      runNextQueuedAction();
    }
  );
}

/** Handles a room-card click while Rogue's Backstab targeting mode
 * (state.rogueTargeting) is active — routed here instead of
 * handleCardClick() by the #room click listener further down. Only a
 * monster is a valid target; clicking anything else just shows a hint and
 * changes nothing (the ✕ badge, not a stray card click, is the way to back
 * out — see the #ability-cancel-btn handler further down). Goes through
 * the same action queue as every other room-card click (see
 * enqueueRoomAction() above) so it can't interleave with an in-flight
 * fight/equip/drink animation. */
function handleBackstabClick(cardId) {
  const card = state.room.find((c) => c.id === cardId);
  if (!card) return;

  if (card.type !== 'monster') {
    renderMessage(t('backstabHint'));
    return;
  }

  enqueueRoomAction((registerSpeedUp, onFinished) => {
    const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
    const result = resolveBackstab(cardId);
    if (!result) {
      onFinished();
      return;
    }

    renderMessage(result.message);
    renderManaRing();
    renderRogueTargeting(); // clears the wiggle/✕ badge — targeting just ended
    if (cardEl) {
      showCardDamage(cardEl, -6);
      cardEl.classList.add('card--shake');
    }

    // Same "let the shake play out on the still-live element before
    // renderRoom() replaces it with a fresh one showing the new number" idea
    // as the Electric weapon effect's weakenedIds feedback in applyResolve().
    const fadeTimer = speedableTimeout(() => {
      renderRoom();
      renderDeckCount();
      renderFleeButton();
      onFinished();
    }, CARD_ANIMATION_MS);
    registerSpeedUp(fadeTimer.speedUp);
  });
}

function handleCardClick(cardId) {
  if (state.gameOver) return;
  // Validate against the room now, at click time — a click on a card that's
  // already gone by the time it reaches the front of the queue (e.g. it was
  // the same card double-clicked) is silently dropped there instead.
  if (!state.room.some((c) => c.id === cardId)) return;

  enqueueRoomAction((registerSpeedUp, onFinished) => {
    const card = state.room.find((c) => c.id === cardId);
    const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
    if (!card || !cardEl) {
      onFinished();
      return;
    }

    // Weapons fly into the weapon slot instead of fading down like other cards.
    if (card.type === 'weapon') {
      const ctl = animateWeaponToSlot(cardEl, () => {
        applyResolve(cardId, {});
        renderRoom();
        renderDeckCount();
        renderFleeButton();
        renderGameOverBanner();
        onFinished();
      });
      registerSpeedUp(ctl.speedUp);
      return;
    }

    // Shields fly into the shield slot the same way weapons fly into theirs
    // (see equipShield()/fightMonster() in js/state.js for the actual
    // block/durability logic).
    if (card.type === 'shield') {
      const ctl = animateShieldToSlot(cardEl, () => {
        applyResolve(cardId, {});
        renderRoom();
        renderDeckCount();
        renderFleeButton();
        renderGameOverBanner();
        onFinished();
      });
      registerSpeedUp(ctl.speedUp);
      return;
    }

    // Monsters use the equipped weapon automatically whenever the "Using
    // weapon" toggle is on and the weapon is legal to use on them; no
    // per-fight prompt.
    resolveAndAnimate(cardId, { useWeapon: state.useWeaponPreference }, registerSpeedUp, onFinished);
  });
}

/** Actually applies a resolved card's effect to `state` and updates every
 * piece of UI that isn't the room itself (HP, weapon slot, message, any
 * per-card "-1" feedback) — shared by the plain fade-resolve path and the
 * weapon-attack path below, so both end up with identical state handling. */
function applyResolve(cardId, options) {
  const hpBefore = state.hp;
  const result = resolveCard(cardId, options);
  if (!result) return null;

  renderHp();
  showHpDelta(state.hp - hpBefore);
  renderWeaponSlot();

  // Shield block feedback: a broken shield needs its shatter animation
  // played BEFORE renderShieldSlot() draws the now-empty slot (the shards
  // are clones of the slot's current, pre-render card face — see
  // animateShieldShatter() in js/ui.js) — renderShieldSlot() only runs
  // once the shards are done flying. A surviving shield just re-renders
  // immediately (showing its lowered durability) and shakes on top of it.
  if (result.shieldBroke) {
    animateShieldShatter(() => renderShieldSlot());
  } else {
    renderShieldSlot();
    if (result.shieldBlocked) animateShieldShake();
  }

  renderMessage(result.message);
  renderChampionAbilityBar({ animateHeal: !!result.paladinCycleComplete });
  renderManaRing(); // a room-clear (see resolveCard() in js/state.js) may have granted mana
  renderAbilityActiveGlow(); // a fight may have burned a Paladin/Berserker charge
  renderWeaponToggle(); // a fight may have run Berserker's Frenzy charges out, switching it back on

  // Electric weapon effect: play a "-1" + shake on each monster it weakened,
  // while their card elements are still the ones actually in the DOM.
  if (result.weakenedIds && result.weakenedIds.length) {
    result.weakenedIds.forEach((id) => {
      const weakenedEl = document.querySelector(`.card[data-id="${id}"]`);
      if (!weakenedEl) return;
      showCardDamage(weakenedEl, -1);
      weakenedEl.classList.add('card--shake');
    });
  }

  // Ranged weapon (see "Ranged Weapons" in CLAUDE.md): a shot that doesn't
  // kill its target leaves that exact card (cardId) still in the room, at
  // its new lower rank — same "-N" + shake feedback as the Electric effect
  // above, just on the card actually being fired at rather than every
  // OTHER monster in the room. Guarded on shotDamage (only set when
  // monsterDied is false, see fireRangedWeapon() in js/state.js) rather than
  // monsterDied directly, so this is a no-op for every non-ranged result too
  // (that field is simply absent on those).
  if (result.shotDamage) {
    const targetEl = document.querySelector(`.card[data-id="${cardId}"]`);
    if (targetEl) {
      showCardDamage(targetEl, -result.shotDamage);
      targetEl.classList.add('card--shake');
    }
  }

  return result;
}

/** @param registerSpeedUp/onFinished — this action's handle into the queue
 * in enqueueRoomAction() above; see the comment there. */
function resolveAndAnimate(cardId, options, registerSpeedUp, onFinished) {
  const card = state.room.find((c) => c.id === cardId);
  const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);

  // Fighting a monster with the equipped weapon (and only then — bare-handed
  // fights, potions, etc. keep the plain fade-resolve below) gets its own
  // "weapon swings out and back" animation instead of just fading in place.
  const willUseWeapon =
    cardEl && card && card.type === 'monster' && options.useWeapon && isWeaponUsableOn(card);

  if (willUseWeapon) {
    // Captured from the onImpact callback below so the onDone callback (once
    // the swing has fully returned) can see whether this fight broke a
    // Fragile/Ranged weapon. See breakEquippedWeapon() in js/state.js for
    // why that actual break waits until here instead of happening at
    // impact.
    let fightResult = null;

    // A Ranged weapon gets its own draw-back/loose-shot swing shape (see
    // animateRangedAttack() in js/ui.js, "Ranged Weapons" in CLAUDE.md)
    // instead of melee's plain out-and-back — same onImpact/onDone contract
    // either way, so nothing below this needs to know which one is playing.
    const attackAnimator =
      state.equippedWeapon && state.equippedWeapon.suit === SUITS.RANGED
        ? animateRangedAttack
        : animateWeaponAttack;

    const ctl = attackAnimator(
      cardEl,
      () => {
        fightResult = applyResolve(cardId, options);

        // A Ranged weapon shot that didn't kill its target (see
        // fireRangedWeapon() in js/state.js, "Ranged Weapons" in CLAUDE.md)
        // leaves the monster's own card in the room at its new, lower rank
        // — it isn't leaving, so no fade-out, just an immediate re-render so
        // the card's number updates (applyResolve() above already played
        // its "-N" + shake feedback on the still-live element).
        if (fightResult && fightResult.monsterDied === false) {
          renderRoom();
          renderDeckCount();
          renderFleeButton();
          renderGameOverBanner(); // a retaliation hit can still be lethal
          return;
        }

        // The state change (damage, message, etc.) already landed right as
        // the weapon visually connected, above — now the card fades the
        // same way any other resolved card does.
        cardEl.classList.add('card--resolved');

        const fadeTimer = speedableTimeout(() => {
          renderRoom();
          renderDeckCount();
          renderFleeButton();
          renderGameOverBanner();
        }, CARD_ANIMATION_MS);
        registerSpeedUp(fadeTimer.speedUp);
      },
      () => {
        // The weapon has fully swung back into the slot, still showing
        // itself intact (see breakEquippedWeapon()'s comment in js/state.js
        // for why fightMonster()/fireRangedWeapon() only reported the break
        // rather than unequipping it earlier). A Fragile or Ranged weapon
        // that just ran out of uses/ammo breaks and shatters right here, now
        // that the slot is back at rest and not mid-swing. Only now is this
        // action considered done, so the next queued click can start.
        if (fightResult && fightResult.weaponBroke) {
          breakEquippedWeapon();
          animateWeaponShatter(() => {
            renderWeaponSlot();
            onFinished();
          });
        } else {
          onFinished();
        }
      }
    );
    registerSpeedUp(ctl.speedUp);
    return;
  }

  // Play the "resolve" animation on the clicked card immediately...
  if (cardEl) cardEl.classList.add('card--resolved');
  if (!applyResolve(cardId, options)) {
    onFinished();
    return;
  }

  // ...then re-render the room (removing/replacing cards) once the
  // animation has had time to finish, so it doesn't get cut short.
  const fadeTimer = speedableTimeout(() => {
    renderRoom();
    renderDeckCount();
    renderFleeButton();
    renderGameOverBanner();
    onFinished();
  }, CARD_ANIMATION_MS);
  registerSpeedUp(fadeTimer.speedUp);
}

/** Shared by every "start a new game" entry point: the start screen's New
 * Game button, the menu's New Game button, the game-over screen's Play
 * Again button, and the call-to-action shown in the room before the first
 * game / after the dungeon ends. None of those call this directly anymore —
 * they all open the champion-select screen first (see openChampionSelect()
 * below); this only actually runs once a champion tile is clicked there, so
 * `championId` is always set by the time this runs. Starting over abandons
 * whatever's mid-animation rather than waiting for it, so the queue is
 * dropped and any leftover inline styles from an interrupted weapon-attack
 * (see animateWeaponAttack in ui.js) are cleared by hand — renderWeaponSlot()
 * (called via renderAll below) only ever touches className/innerHTML, not
 * those. */
/** @param options.deck - passed straight through to initGame() — only the
 * Tutorial (js/tutorial.js's startTutorial()) uses this, to run on its
 * fixed scripted deck instead of a real shuffle. */
function startNewGame(championId, options = {}) {
  actionQueue.length = 0;
  queueBusy = false;
  speedUpCurrentAction = null;
  const slot = document.getElementById('weapon-slot-card');
  slot.style.transition = '';
  slot.style.transform = '';
  slot.style.zIndex = '';
  slot.style.position = '';

  initGame(championId, options);
  renderAll();
  closeChampionSelect();
  closeMenu();
  showGameScreen();
}

// --- start screen / game screen switching -----------------------------------

function showStartScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

function showGameScreen() {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
}

document.getElementById('room').addEventListener('click', (event) => {
  if (event.target.closest('#room-start-btn')) {
    openChampionSelect();
    return;
  }
  const cardEl = event.target.closest('.card');
  if (!cardEl) return;

  // Rogue's Backstab targeting mode intercepts every room-card click while
  // active — see handleBackstabClick() above and useAbility()/
  // cancelBackstab()/resolveBackstab() in js/state.js.
  if (state.rogueTargeting) {
    handleBackstabClick(cardEl.dataset.id);
    return;
  }

  handleCardClick(cardEl.dataset.id);
});

document.getElementById('flee-btn').addEventListener('click', () => {
  // Fleeing replaces the whole room; doing that while a queued card is
  // mid-animation (see the action queue above) would pull the rug out from
  // under it, so it's ignored until the queue is idle again — same as
  // clicking a card is, just without a visible queued click to speed
  // anything up.
  if (queueBusy) return;

  const result = fleeRoom();
  if (!result) return;
  renderMessage(result.message);
  renderRoom();
  renderRogueTargeting(); // new room's monsters need the wiggle too, if still armed
  renderDeckCount();
  renderFleeButton();
  renderChampionAbilityBar();
  renderManaRing(); // a successful flee (see fleeRoom() in js/state.js) grants mana
});

// Champion active ability — see useAbility() in js/state.js. Only usable
// once renderManaRing() has removed .ability-btn--disabled (enough mana
// collected); useAbility() itself re-checks this and returns null otherwise,
// so a stale/disabled click here is silently a no-op either way.
document.getElementById('ability-btn').addEventListener('click', () => {
  const hpBefore = state.hp;
  const result = useAbility();
  if (!result) return;
  renderMessage(result.message);
  renderManaRing();
  renderAbilityActiveGlow(); // e.g. Paladin's blessing just turned on
  renderWeaponToggle(); // Berserker's Frenzy just forced "Using weapon" off
  renderWeaponSlot();

  // Herbalist (or any future ability that heals): same before/after HP-delta
  // feedback every other heal already gets, plus a little "+" particle burst
  // around the button itself — see useAbility()'s `healed` return value.
  if (state.hp !== hpBefore) {
    renderHp();
    showHpDelta(state.hp - hpBefore);
  }
  if (result.healed > 0) {
    showAbilityHealBurst();
  }

  // Rogue's Backstab just armed itself (targeting: true) — wiggle every
  // monster in the room and show the ✕ cancel badge.
  if (result.targeting) {
    renderRogueTargeting();
  }
});

// The ✕ badge next to the ability button — the only way to back out of
// Rogue's Backstab targeting mode (see useAbility() in js/state.js) without
// spending the mana it cost to arm it.
document.getElementById('ability-cancel-btn').addEventListener('click', () => {
  const result = cancelBackstab();
  if (!result) return;
  renderMessage(result.message);
  renderRogueTargeting();
});

document.getElementById('weapon-toggle').addEventListener('change', (event) => {
  state.useWeaponPreference = event.target.checked;
  renderWeaponSlot();
});

// Every "New Game" entry point opens the champion-select screen instead of
// starting straight away — startNewGame() only runs once a champion tile is
// actually clicked there (see the champion-select wiring further down).
document.getElementById('new-game-btn').addEventListener('click', openChampionSelect);
document.getElementById('play-again-btn').addEventListener('click', openChampionSelect);
document.getElementById('start-new-game-btn').addEventListener('click', openChampionSelect);

document.getElementById('gameover-menu-btn').addEventListener('click', () => {
  // Leaving via the win/lose banner doesn't reset state.gameOver, so the
  // banner itself must be hidden explicitly here — otherwise it stays
  // stacked on top of the start screen (showStartScreen() only toggles
  // #start-screen/#game-screen, it doesn't touch #gameover-overlay).
  document.getElementById('gameover-overlay').classList.add('hidden');
  showStartScreen();
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  closeMenu();
  showStartScreen();
});

// --- hamburger menu (New Game + rules) --------------------------------------

function openMenu(fromGame = true) {
  // "New Game" only makes sense when opened from the in-game hamburger menu
  // (#menu-btn) — the start screen's own "Anleitung" button reuses this same
  // overlay just for the rules text, so it hides the button in that case.
  document.getElementById('new-game-btn').classList.toggle('hidden', !fromGame);
  document.getElementById('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
  document.getElementById('menu-overlay').classList.add('hidden');
}

document.getElementById('menu-btn').addEventListener('click', () => openMenu(true));
document.getElementById('menu-close-btn').addEventListener('click', closeMenu);

// Clicking the dimmed backdrop (not the panel itself) closes the menu.
document.getElementById('menu-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'menu-overlay') closeMenu();
});

// --- options (language) ------------------------------------------------------
// Reuses #menu-overlay/#gallery-overlay's exact chrome (see the shared
// selectors in style.css) rather than duplicating it, same as every other
// overlay in this project. Reachable from the start screen's own "Options"
// button and from a matching button inside the in-game hamburger menu — the
// latter closes the menu first (see openMenu()/closeMenu() above) so only
// one dimmed overlay is ever showing at a time, the same single-overlay-swap
// pattern "Anleitung" already uses for the rules text.

function openOptions() {
  renderLanguageButtons();
  document.getElementById('options-overlay').classList.remove('hidden');
}

function closeOptions() {
  document.getElementById('options-overlay').classList.add('hidden');
}

/** Switches the active language, re-applies it to every static piece of UI
 * (buttons, headings, the rules text — see applyStaticI18n() in js/ui.js),
 * and re-renders everything currently driven by `state` so an in-progress
 * game (message, weapon status, HP text, etc.) updates immediately too.
 * renderAll() is safe to call even before any game has started — it just
 * redraws the empty-room call-to-action and the default equipment-slot
 * placeholders with the new language's text, same as it always does. */
function applyLanguage(lang) {
  setLang(lang);
  document.documentElement.lang = lang;
  applyStaticI18n();
  renderAll();
}

document.getElementById('options-btn').addEventListener('click', openOptions);
document.getElementById('menu-options-btn').addEventListener('click', () => {
  closeMenu();
  openOptions();
});
document.getElementById('options-close-btn').addEventListener('click', closeOptions);

// Clicking the dimmed backdrop (not the panel itself) closes Options.
document.getElementById('options-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'options-overlay') closeOptions();
});

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

// --- start screen galleries (Champions/Weapons/Monsters) + Anleitung -------
// "Anleitung" reuses the same rules overlay as the in-game hamburger menu
// (#menu-overlay) rather than duplicating the rules text anywhere else.

function openGallery(kind) {
  renderGallery(kind);
  document.getElementById('gallery-overlay').classList.remove('hidden');
}

function closeGallery() {
  document.getElementById('gallery-overlay').classList.add('hidden');
}

document.getElementById('champions-btn').addEventListener('click', () => openGallery('champions'));
document.getElementById('weapons-btn').addEventListener('click', () => openGallery('weapons'));
document.getElementById('monsters-btn').addEventListener('click', () => openGallery('monsters'));
document.getElementById('shields-btn').addEventListener('click', () => openGallery('shields'));
document.getElementById('anleitung-btn').addEventListener('click', () => openMenu(false));

document.getElementById('gallery-close-btn').addEventListener('click', closeGallery);

// Clicking the dimmed backdrop (not the panel itself) closes the gallery.
document.getElementById('gallery-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'gallery-overlay') closeGallery();
});

// --- gallery item detail popup (click a weapon/monster tile) ---------------
// Sits on top of #gallery-overlay rather than replacing it, so closing the
// detail popup leaves the gallery grid open behind it.

function openGalleryDetail(kind, rank) {
  renderGalleryDetail(kind, rank);
  document.getElementById('gallery-detail-overlay').classList.remove('hidden');
}

function closeGalleryDetail() {
  document.getElementById('gallery-detail-overlay').classList.add('hidden');
}

// Delegated on the grid rather than one listener per tile, since the grid's
// contents are fully rebuilt every time renderGallery() runs. Weapons/
// monsters key off a numeric rank; champions key off their string id (see
// buildGalleryItem() in js/ui.js) — only the former should be coerced to a
// Number.
document.getElementById('gallery-grid').addEventListener('click', (event) => {
  const item = event.target.closest('.gallery-item');
  if (!item) return;
  const kind = item.dataset.kind;
  const key = kind === 'champions' ? item.dataset.key : Number(item.dataset.key);
  openGalleryDetail(kind, key);
});

document.getElementById('gallery-detail-close-btn').addEventListener('click', closeGalleryDetail);

document.getElementById('gallery-detail-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'gallery-detail-overlay') closeGalleryDetail();
});

// --- champion-select screen --------------------------------------------------
// Shown whenever a new game is started (see every "New Game"/"Play Again"
// listener above, and the room's empty-state CTA) — the actual game only
// starts once a champion tile is clicked here (see the delegated click
// handler below), which calls startNewGame(championId).

function openChampionSelect() {
  renderChampionSelect();
  document.getElementById('champion-select-overlay').classList.remove('hidden');
}

function closeChampionSelect() {
  document.getElementById('champion-select-overlay').classList.add('hidden');
}

// Delegated on the grid rather than one listener per tile, since the grid's
// contents are fully rebuilt every time renderChampionSelect() runs.
document.getElementById('champion-select-grid').addEventListener('click', (event) => {
  const item = event.target.closest('.champion-select-item');
  if (!item) return;
  startNewGame(item.dataset.championId);
});

document.getElementById('champion-select-close-btn').addEventListener('click', closeChampionSelect);

// Clicking the dimmed backdrop (not the panel itself) closes champion-select
// without starting a game — same as the menu/gallery overlays.
document.getElementById('champion-select-overlay').addEventListener('click', (event) => {
  if (event.target.id === 'champion-select-overlay') closeChampionSelect();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    closeGalleryDetail();
    closeGallery();
    closeChampionSelect();
    closeOptions();
  }
});

// --- custom card-name hover tooltip ------------------------------------------
// Delegated on <body> (not one listener per card) since room cards are torn
// down and rebuilt on every render — a per-card listener would need
// re-attaching every single time. Uses 'mouseover'/'mouseout' rather than
// 'mouseenter'/'mouseleave' specifically because those two don't bubble, so
// they can't be delegated; closest('[data-tooltip]') plus the
// contains(relatedTarget) check below reproduces the same "only fires once
// per actual enter/leave of the whole element" behavior mouseenter/mouseleave
// would give for free on a direct (non-delegated) listener. Every element
// that should show this tooltip (room cards, the equipped weapon/shield
// slots) gets its text via a plain `data-tooltip` attribute — see
// cardTooltipText()/renderCard()/renderWeaponSlot()/renderShieldSlot() in
// js/ui.js — read here rather than duplicating that lookup logic.
document.body.addEventListener('mouseover', (event) => {
  const target = event.target.closest('[data-tooltip]');
  if (target) showCardTooltip(target);
});

document.body.addEventListener('mouseout', (event) => {
  const target = event.target.closest('[data-tooltip]');
  // relatedTarget is where the pointer is going; if it's still somewhere
  // inside the same tooltip-bearing element (e.g. onto its own artwork
  // <img>), this isn't a real "leave" yet, so don't hide the tooltip.
  if (target && !target.contains(event.relatedTarget)) hideCardTooltip();
});

// --- initial page load -------------------------------------------------------
// Apply the stored (or default) language to the static UI before anything
// else renders, so the very first paint — start screen, empty room, equipment
// slots — already shows the right language instead of flashing English first.
document.documentElement.lang = getLang();
applyStaticI18n();
renderLanguageButtons();

// state starts with an empty room (no game started yet); render that empty
// state (the New Game call-to-action) and the flee button's disabled look
// instead of relying on the static HTML markup to already match it.
renderRoom();
renderFleeButton();
renderWeaponSlot();
