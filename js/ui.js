// ---------------------------------------------------------------------------
// Scoundrel — rendering only. Reads `state` from state.js and draws it to the
// DOM. Contains no game rules — clicks are wired up in main.js, which calls
// into state.js and then asks this file to re-render.
// ---------------------------------------------------------------------------

/** Fills a card-shaped element with a card's face: the type's illustrated
 * base frame (see .card--monster/weapon/shield/potion's background-image in
 * style.css, cropped from the user-supplied images/CardDesigns.jpeg sheet —
 * see "Card frame artwork" in CLAUDE.md), the item's artwork (or the suit
 * symbol as a fallback, for any card without artwork) laid over the frame's
 * blank parchment area, the card's numeric value centered in the frame's
 * hexagon at the bottom — always a plain number, never a suit letter (no
 * J/Q/K/A) — and, for a weapon with a rolled effect, a small corner badge.
 * Shared by renderCard() and the weapon/shield slots, which display the
 * equipped item the same way.
 *
 * The artwork and value label are both wrapped in their own absolutely
 * positioned container (.card-art / .card-value-label itself), sized via
 * the --art-... / --hex-... percentage custom properties set per card type in
 * style.css — percentages so the same markup works unchanged at every
 * --card-scale/--weapon-slot-scale tier without a separate px override per
 * size (the old flex-centered layout needed one, see CLAUDE.md). .card-art
 * needs a wrapper div (not just the <img> itself) since only a flex
 * container, not a leaf <img>, can center a variable-aspect-ratio image
 * within a fixed-percentage box via max-width/max-height. */
function fillCardFace(el, card) {
  el.innerHTML = '';

  const art = document.createElement('div');
  art.className = 'card-art';
  if (card.image) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = card.image;
    img.alt = card.name;
    art.appendChild(img);
  } else {
    const symbol = document.createElement('div');
    symbol.className = 'card-suit-symbol';
    symbol.textContent = SUIT_SYMBOLS[card.suit];
    art.appendChild(symbol);
  }
  el.appendChild(art);

  if (card.effect && WEAPON_EFFECTS[card.effect]) {
    const effect = WEAPON_EFFECTS[card.effect];
    const badge = document.createElement('div');
    badge.className = 'card-effect-badge';
    badge.textContent = effect.icon;
    badge.title = `${effect.name}: ${effect.description}`;
    el.appendChild(badge);
  }

  const value = document.createElement('div');
  value.className = 'card-value-label';
  value.textContent = card.rank;
  el.appendChild(value);
}

/** Strength tier (1 weakest - 5 strongest) for a card's rank, used to scale
 * the border/glow treatment in style.css (.card--tier-N). Weapons/potions
 * only go up to rank 10, so they naturally top out around tier 3 — only a
 * monster can reach tier 4/5. */
function cardTier(rank) {
  if (rank >= 14) return 5;
  if (rank >= 11) return 4;
  if (rank >= 8) return 3;
  if (rank >= 5) return 2;
  return 1;
}

/** The flavor name shown as a card's tooltip (e.g. "Major Health Potion",
 * not the underlying poker-card name "8 of Hearts", see renderCard() below).
 * Keyed off `baseRank`, not the (possibly effect-lowered) current `rank`,
 * so a monster weakened by the Electric weapon effect still shows as the
 * same creature. */
function flavorNameFor(card) {
  if (card.type === 'monster') return monsterNameFor(card.baseRank);
  if (card.type === 'potion') return potionNameFor(card.baseRank);
  if (card.type === 'weapon') return weaponNameFor(card.baseRank);
  if (card.type === 'shield') return shieldNameFor(card.baseRank);
  return null;
}

/** Whether a card is strong enough to get the extra pulsing "aura" (rotating
 * glow ring + breathing shadow, see .card--aura in style.css) on top of the
 * normal tier border — the very strongest monsters (rank 11-14) and
 * the 3 strongest weapons (rank 8+, since weapons cap at 10). Potions don't
 * get one — they already have their own always-on life-pulse. */
function hasAura(card) {
  if (card.type === 'monster') return card.rank >= 11;
  if (card.type === 'weapon') return card.rank >= 8;
  return false;
}

/** Applies a card's own glow color (card.glowRgb, an "R, G, B" string —
 * currently only weapons carry one, defaulting to white) as an inline
 * --edge-rgb override, taking precedence over the type-based CSS classes
 * (.card--monster/weapon/potion). This is the hook for a specific card to
 * have its own glow later — e.g. a fire weapon with an orange glowRgb —
 * without changing the shared tier system in style.css. */
function applyGlowColor(el, card) {
  if (card.glowRgb) {
    el.style.setProperty('--edge-rgb', card.glowRgb);
  } else {
    el.style.removeProperty('--edge-rgb');
  }
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = `card card--${card.type} card--tier-${cardTier(card.rank)}`;
  if (hasAura(card)) el.classList.add('card--aura');
  el.dataset.suit = card.suit;
  el.dataset.id = card.id;
  applyGlowColor(el, card);
  // Tooltip shows the flavor name only, never the underlying poker-card
  // name ("8 of Hearts"). Falls back to it only for a hypothetical card
  // with no flavor name at all (doesn't happen for any real card today).
  const title = flavorNameFor(card) || card.name;
  const effect = card.effect && WEAPON_EFFECTS[card.effect];
  el.title = effect ? `${title} (${effect.name})` : title;
  fillCardFace(el, card);
  return el;
}

/** When there's no active room (before the first game, or once the dungeon
 * is fully cleared/lost), show a "New Game" call-to-action in its place
 * instead of leaving the room area blank. */
function renderRoom() {
  const roomEl = document.getElementById('room');
  roomEl.innerHTML = '';

  if (state.room.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'room-empty';

    const tagline = document.createElement('p');
    tagline.id = 'room-empty-tagline';
    tagline.textContent = t('roomEmptyTagline');

    const cta = document.createElement('button');
    cta.id = 'room-start-btn';
    cta.textContent = t('newGame');

    empty.appendChild(tagline);
    empty.appendChild(cta);
    roomEl.appendChild(empty);
    return;
  }

  state.room.forEach((card) => roomEl.appendChild(renderCard(card)));
}

function renderDeckCount() {
  document.getElementById('deck-count').textContent = t('deckCount', { n: state.deck.length });
}

/** Fills the small circular portrait next to the HP bar with the currently
 * selected champion's artwork (or the plain-letter placeholder — see
 * fillPortrait() — for a champion that has no image yet). Called from
 * renderAll(), so it stays in sync with whatever startNewGame() picked. */
function renderChampionBadge() {
  const badge = document.getElementById('champion-badge');
  const champ = championById(state.champion);
  fillPortrait(badge, champ && champ.image, champ && champ.name, champ ? champ.name.charAt(0) : '?');
  badge.title = champ ? `${champ.name}: ${champ.description}` : '';
}

/** Fills #ability-btn with the current champion's active-ability icon (see
 * js/ability-icons.js). Called from renderAll(), same pattern as
 * renderChampionBadge(). This just keeps the icon in sync with whichever
 * champion startNewGame() picked — the button's enabled/disabled look and
 * mana ring are renderManaRing()'s job, below. */
function renderAbilityButton() {
  const icon = document.getElementById('ability-icon');
  const champ = championById(state.champion);
  const src = champ ? abilityIconFor(champ.id) : null;
  if (src) {
    icon.src = src;
    icon.alt = champ.name;
  } else {
    icon.removeAttribute('src');
    icon.alt = '';
  }
  document.getElementById('ability-btn').title = champ
    ? t('championAbilityTitle', { name: champ.name, cost: abilityManaCostFor(champ.id) })
    : '';
}

/** Fills the #ability-info-btn hover popup with the current champion's
 * active-ability name/description (js/ability-icons.js's ABILITY_DETAILS),
 * and hides the whole badge before any champion is picked (nothing to
 * explain yet). Called from renderAll(), same pattern as
 * renderAbilityButton() right above it — this just keeps the popup's text
 * in sync with whichever champion is active; showing/hiding the popup
 * itself on hover/focus is pure CSS (see #ability-info-popup in
 * style.css), no JS needed for that part. */
function renderAbilityInfo() {
  const btn = document.getElementById('ability-info-btn');
  const details = state.champion ? abilityDetailsFor(state.champion) : null;
  btn.classList.toggle('hidden', !details);
  document.getElementById('ability-info-name').textContent = details ? details.name : '';
  document.getElementById('ability-info-text').textContent = details ? details.description : '';
}

/** Returns { total, filled } describing the current champion's active-
 * ability mana gauge (total = ABILITY_MANA_COST, filled = state.mana,
 * already clamped by gainMana() in js/state.js), or null before a champion
 * is picked. Mirrors championAbilityProgress()'s shape above, just for the
 * mana ring instead of the passive-progress bar. */
function abilityManaProgress() {
  if (!state.champion) return null;
  return { total: abilityManaCostFor(state.champion), filled: state.mana };
}

/** Paints #mana-ring's segmented, blue conic-gradient gauge around
 * #ability-btn and toggles the disabled/greyed-out look
 * (.ability-btn--disabled / .ability-wrap--disabled, see style.css) until
 * enough mana is filled — both classes are kept in sync since style.css's
 * hover-lift is scoped to #ability-wrap (so the ring rises together with
 * the button instead of the button sliding off it alone) but still needs
 * to know whether the ability is actually usable. Mirrors
 * renderChampionAbilityBar()'s discrete filled/unfilled segments — same
 * idea, just bent into a ring instead of a straight bar, and blue (mana)
 * instead of green (passive progress). A single conic-gradient (computed
 * here, not one DOM element per segment) is used because the segment count
 * varies by champion (3-5, see ABILITY_MANA_COST). Called from renderAll()
 * and after every mana-changing action (room clear, flee, ability use). */
function renderManaRing() {
  const wrap = document.getElementById('ability-wrap');
  const ring = document.getElementById('mana-ring');
  const btn = document.getElementById('ability-btn');
  const progress = abilityManaProgress();

  if (!progress || progress.total <= 0) {
    ring.style.background = 'none';
    btn.classList.add('ability-btn--disabled');
    wrap.classList.add('ability-wrap--disabled');
    return;
  }

  const { total, filled } = progress;
  const segAngle = 360 / total;
  const gap = Math.min(6, segAngle * 0.25);
  // conic-gradient's own 0deg already points straight up (12 o'clock) and
  // sweeps clockwise, unlike a math angle where 0deg points right — an
  // earlier version started this loop at -90deg to "start at the top",
  // which was redundant AND pushed every stop into negative degrees.
  // Negative stop positions get clamped by the browser, which silently cut
  // the last ~90deg off the ring (it only ever reached 3/4 of the way
  // around). Stops must stay within [0deg, 360deg] — start at 0 instead,
  // and the ring already starts at the top for free. The tiny leading
  // transparent sliver keeps the seam between the last and first segment
  // the same width as every other inter-segment gap.
  const stops = [`transparent 0deg ${gap / 2}deg`];
  let angle = 0;
  for (let i = 0; i < total; i++) {
    const start = angle + gap / 2;
    const end = angle + segAngle - gap / 2;
    const color = i < filled ? 'rgb(var(--mana-rgb))' : 'rgba(255, 255, 255, 0.08)';
    stops.push(`${color} ${start}deg ${end}deg`);
    stops.push(`transparent ${end}deg ${angle + segAngle}deg`);
    angle += segAngle;
  }
  ring.style.background = `conic-gradient(${stops.join(', ')})`;

  const disabled = filled < total;
  btn.classList.toggle('ability-btn--disabled', disabled);
  wrap.classList.toggle('ability-wrap--disabled', disabled);
}

/** Toggles #ability-wrap's pulsing golden .ability-wrap--active glow (see
 * style.css) while the current champion's active ability has an ongoing
 * effect running — Paladin's paladinResistCharges (counts down as he takes
 * reduced-damage hits) or Berserker's berserkerFrenzyCharges (counts down
 * as his weapon ignores its degrade limit, see fightMonster() in
 * js/state.js) — either way the glow disappears the instant its counter
 * hits 0. Lives on #ability-wrap rather than #ability-btn itself — see the
 * comment on .ability-wrap--active::after in style.css for why (short
 * version: #ability-btn is a real <button> and clips its own glow, or its
 * own hover sheen leaks out, depending on which way that gets fixed). A
 * future champion with its own ongoing-effect state should add another `||`
 * branch here the same way rather than a whole parallel function. Called
 * from renderAll() and after every action that can change an ongoing-effect
 * counter (currently: fighting a monster, via applyResolve() in js/main.js,
 * and activating the ability itself). */
function renderAbilityActiveGlow() {
  const active =
    (state.champion === 'paladin' && state.paladinResistCharges > 0) ||
    (state.champion === 'berserker' && state.berserkerFrenzyCharges > 0);
  document.getElementById('ability-wrap').classList.toggle('ability-wrap--active', active);
}

/** Reflects Rogue's Backstab targeting mode (state.rogueTargeting) in the
 * room and on the ability button: every monster currently in #room gets
 * .card--targetable (a continuous wiggle, see style.css) so it's obvious a
 * target needs to be picked, and #ability-cancel-btn (the ✕ badge) is
 * shown/hidden to match. Called from renderAll() and after anything that
 * can change state.rogueTargeting: arming it (the ability-button click
 * handler), canceling it, and resolving a Backstab — all in js/main.js. */
function renderRogueTargeting() {
  const targeting = !!state.rogueTargeting;
  document.querySelectorAll('#room .card--monster').forEach((el) => {
    el.classList.toggle('card--targetable', targeting);
  });
  document.getElementById('ability-cancel-btn').classList.toggle('hidden', !targeting);
}

/** Returns { total, filled, label } describing the current champion's
 * repeating-passive progress bar (see #champion-ability-bar in style.css),
 * or null if the current champion has no such bar (Berserker, or no
 * champion picked yet). `filled` is always in [0, total].
 *   - Paladin: 5 segments, one per kill since the last heal-trigger — heals
 *     3 HP every 5th kill (state.monstersDefeated), so filled cycles
 *     1..5 and shows a full bar right after a heal instead of resetting to
 *     0 in the same instant it triggers (state.monstersDefeated itself
 *     never resets — it's a running total — so the cycle is derived here).
 *   - Rogue: 2 segments, one per room fled in a row (state.fleeStreak,
 *     already reset to 0 whenever a room is completed or a new game
 *     starts — see resolveCard()/fleeRoom() in state.js).
 *   - Herbalist: 2 segments, one per potion that actually healed this room
 *     (state.potionsDrunkThisRoom, already reset to 0 on every new room —
 *     see resolveCard()/fleeRoom() in state.js). */
function championAbilityProgress() {
  if (state.champion === 'paladin') {
    const total = 5;
    const filled = state.monstersDefeated === 0 ? 0 : ((state.monstersDefeated - 1) % total) + 1;
    return { total, filled, label: t('paladinProgress', { filled, total }) };
  }
  if (state.champion === 'rogue') {
    const total = 2;
    const filled = Math.min(state.fleeStreak, total);
    return { total, filled, label: t('rogueProgress', { filled: state.fleeStreak, total }) };
  }
  if (state.champion === 'herbalist') {
    const total = 2;
    const filled = Math.min(state.potionsDrunkThisRoom, total);
    return { total, filled, label: t('herbalistProgress', { filled: state.potionsDrunkThisRoom, total }) };
  }
  return null;
}

// Paladin's full-bar heal celebration (see renderChampionAbilityBar()'s
// animateHeal option below): hold the full 5/5 bar this long, then drain it
// back to empty over this long. The drain duration is kept in sync with the
// .ability-bar--draining transition-duration in style.css.
const PALADIN_HEAL_HOLD_MS = 1000;
const PALADIN_HEAL_DRAIN_MS = 1000;

/** Fills #champion-ability-bar with one segment per championAbilityProgress()
 * step, or hides it entirely for a champion without one. Called from
 * renderAll(), so it stays current after every fight/flee/potion/new room.
 * @param options.animateHeal - pass true only on the fight that completed a
 *   Paladin 5-kill cycle (result.paladinCycleComplete from fightMonster(),
 *   threaded through resolveCard()): the bar still renders full immediately
 *   (state already reflects the completed cycle), but after a beat it fades
 *   back to empty instead of silently jumping to the next cycle's 1/5 on the
 *   following kill, so the heal reads as a clear, celebratory beat. */
function renderChampionAbilityBar(options = {}) {
  const bar = document.getElementById('champion-ability-bar');
  const progress = championAbilityProgress();
  bar.classList.remove('ability-bar--draining');

  if (!progress) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    bar.title = '';
    return;
  }

  bar.classList.remove('hidden');
  bar.title = progress.label;
  bar.innerHTML = '';
  for (let i = 0; i < progress.total; i++) {
    const segment = document.createElement('div');
    segment.className = 'ability-segment' + (i < progress.filled ? ' ability-segment--filled' : '');
    bar.appendChild(segment);
  }

  if (options.animateHeal) {
    setTimeout(() => {
      bar.classList.add('ability-bar--draining');
      // Two nested rAFs so the browser paints the (slow-transition) class
      // before the filled class comes off — otherwise the removal can land
      // in the same style-recalc as the class add and skip the transition
      // entirely, jumping straight to empty instead of fading.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.querySelectorAll('.ability-segment--filled').forEach((seg) => {
            seg.classList.remove('ability-segment--filled');
          });
        });
      });
      setTimeout(() => bar.classList.remove('ability-bar--draining'), PALADIN_HEAL_DRAIN_MS);
    }, PALADIN_HEAL_HOLD_MS);
  }
}

function renderHp() {
  const pct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
  const fill = document.getElementById('hp-fill');
  fill.style.width = `${pct}%`;
  document.getElementById('hp-text').textContent = t('hpText', { hp: state.hp, maxHp: state.maxHp });
  // Low-health pulse, purely a style hint (see .hp-bar--low in style.css).
  document.getElementById('hp-bar').classList.toggle('hp-bar--low', pct > 0 && pct <= 25);
}

// Keep in sync with the animation-duration on .hp-float in style.css.
const HP_FLOAT_MS = 1100;

/** Shows a floating "+N" (green, drifts up) or "-N" (red, drifts down) over
 * the HP bar — called whenever state.hp actually changed. */
function showHpDelta(delta) {
  if (!delta) return;
  const container = document.getElementById('hp-float-container');
  const el = document.createElement('span');
  el.className = `hp-float ${delta > 0 ? 'hp-float--heal' : 'hp-float--damage'}`;
  el.textContent = delta > 0 ? `+${delta}` : `${delta}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), HP_FLOAT_MS);
}

/** Shows a floating "-1" (or "+1") over a specific card still in the DOM —
 * currently used when the Electric weapon effect weakens a monster.
 * Positioned via getBoundingClientRect and appended to <body> (position:
 * fixed, see .card-float in style.css) rather than as a child of `cardEl`,
 * because renderRoom() replaces the room's card elements shortly after
 * (see CARD_ANIMATION_MS in main.js) — anchoring to the card itself would
 * cut the animation short. */
function showCardDamage(cardEl, delta) {
  if (!delta) return;
  const rect = cardEl.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = `card-float ${delta > 0 ? 'card-float--heal' : 'card-float--damage'}`;
  el.textContent = delta > 0 ? `+${delta}` : `${delta}`;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), HP_FLOAT_MS);
}

// Keep in sync with the animation-duration on .ability-heal-particle in style.css.
const ABILITY_HEAL_PARTICLE_MS = 750;

/** Spawns a handful of small "+" marks scattered randomly around
 * #ability-btn and fading up/out over ABILITY_HEAL_PARTICLE_MS — a quick,
 * silly little "heal burst" played whenever using the ability actually
 * restores HP (currently just Herbalist's, see useAbility()'s `healed`
 * return value in js/state.js). Appended as children of #ability-wrap
 * (which is already `position: relative`) rather than <body> +
 * getBoundingClientRect like showCardDamage() — unlike a room card, the
 * ability button is a permanent fixture that renderAll() never tears down
 * mid-animation, so there's no need for that workaround here. */
function showAbilityHealBurst() {
  const wrap = document.getElementById('ability-wrap');
  const count = 5 + Math.floor(Math.random() * 3); // 5-7 marks
  for (let i = 0; i < count; i++) {
    const mark = document.createElement('span');
    mark.className = 'ability-heal-particle';
    mark.textContent = '+';
    // Scattered in a ring around the button, at a random angle/distance so
    // every burst looks a little different rather than a fixed pattern.
    const angle = Math.random() * Math.PI * 2;
    const distance = 45 + Math.random() * 35; // % of #ability-wrap's own size
    mark.style.left = `${50 + Math.cos(angle) * distance}%`;
    mark.style.top = `${50 + Math.sin(angle) * distance}%`;
    mark.style.animationDelay = `${Math.random() * 150}ms`;
    wrap.appendChild(mark);
    setTimeout(() => mark.remove(), ABILITY_HEAL_PARTICLE_MS + 150);
  }
}

function renderWeaponSlot() {
  const slot = document.getElementById('weapon-slot-card');
  const status = document.getElementById('weapon-status');

  if (!state.equippedWeapon) {
    slot.className = 'card weapon-slot-empty';
    slot.style.removeProperty('--edge-rgb');
    delete slot.dataset.suit;
    slot.innerHTML = '<div class="sword-icon">⚔</div>';
  } else {
    slot.className = `card card--weapon card--tier-${cardTier(state.equippedWeapon.rank)}`;
    if (hasAura(state.equippedWeapon)) slot.classList.add('card--aura');
    slot.dataset.suit = state.equippedWeapon.suit;
    applyGlowColor(slot, state.equippedWeapon);
    fillCardFace(slot, state.equippedWeapon);
  }

  // Grayed out whenever the toggle is off, so it's visually obvious you're
  // fighting bare-handed right now regardless of what's equipped.
  slot.classList.toggle('weapon-slot-inactive', !state.useWeaponPreference);

  if (!state.useWeaponPreference) {
    status.textContent = t('fightingBareHanded');
  } else if (!state.equippedWeapon) {
    status.textContent = t('noWeaponEquipped');
  } else {
    // Berserker's Frenzy (see fightMonster()/isWeaponUsableOn() in
    // js/state.js) lifts the degrade restriction entirely while active —
    // reflect that here too, so this line doesn't keep claiming a
    // restriction that currently doesn't apply.
    const frenzied = state.champion === 'berserker' && state.berserkerFrenzyCharges > 0;
    const restriction =
      frenzied
        ? t('frenzyOverrides', { n: state.berserkerFrenzyCharges })
        : state.weaponMaxMonster === null
          ? t('canDefeatAny')
          : t('canOnlyDefeatWeaker', { n: state.weaponMaxMonster });
    const effect = state.equippedWeapon.effect && WEAPON_EFFECTS[state.equippedWeapon.effect];
    status.textContent = effect ? `${restriction}. ${effect.name}: ${effect.description}` : restriction;
  }

  renderWeaponFragileBar();
}

/** Fills #weapon-fragile-bar with one segment per FRAGILE_MAX_USES, mirroring
 * renderChampionAbilityBar()'s discrete filled/unfilled segments (same CSS
 * classes, .ability-segment/.ability-segment--filled, just a second bar
 * instance), full when a Fragile weapon (see js/weapon-effects.js) is
 * freshly equipped, one segment drains per use (state.weaponFragileUsesRemaining,
 * js/state.js) until it empties right as the weapon breaks. Hidden entirely
 * for a non-Fragile weapon or no weapon at all. Called from renderWeaponSlot()
 * itself (not a separate call site to remember) so it can never drift out of
 * sync with whichever weapon is currently equipped. */
function renderWeaponFragileBar() {
  const bar = document.getElementById('weapon-fragile-bar');
  const fragile = state.equippedWeapon && state.equippedWeapon.effect === 'fragile';

  if (!fragile) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    bar.title = '';
    return;
  }

  const filled = Math.max(0, state.weaponFragileUsesRemaining);
  bar.classList.remove('hidden');
  bar.title = t('fragileBarTitle', { filled, total: FRAGILE_MAX_USES });
  bar.innerHTML = '';
  for (let i = 0; i < FRAGILE_MAX_USES; i++) {
    const segment = document.createElement('div');
    segment.className = 'ability-segment' + (i < filled ? ' ability-segment--filled' : '');
    bar.appendChild(segment);
  }
}

/** Mirrors renderWeaponSlot() for the shield slot — shields don't have a
 * status line or toggle to keep in sync (no "using shield" preference),
 * just the slot's own display. */
function renderShieldSlot() {
  const slot = document.getElementById('shield-slot-card');

  if (!state.equippedShield) {
    slot.className = 'card shield-slot-empty';
    slot.style.removeProperty('--edge-rgb');
    delete slot.dataset.suit;
    slot.innerHTML = '<div class="shield-icon">S</div>';
  } else {
    const shield = state.equippedShield;
    slot.className = `card card--shield card--tier-${cardTier(shield.rank)}`;
    slot.dataset.suit = shield.suit;
    applyGlowColor(slot, shield);
    fillCardFace(slot, shield);
  }
}

function renderMessage(text) {
  const el = document.getElementById('message');
  el.textContent = text || '';
  el.classList.toggle('message--won', state.outcome === 'won');
  el.classList.toggle('message--lost', state.outcome === 'lost');
}

function renderFleeButton() {
  const btn = document.getElementById('flee-btn');
  // Mirrors the cap in fleeRoom() (js/state.js): normally 1 flee in a row,
  // or 2 for the Rogue champion.
  const maxFleeStreak = state.champion === 'rogue' ? 2 : 1;
  const canFlee = !state.gameOver && state.room.length === 4 && state.fleeStreak < maxFleeStreak;
  btn.disabled = !canFlee;
  btn.title =
    state.fleeStreak >= maxFleeStreak
      ? maxFleeStreak > 1
        ? t('fleeCantThrice')
        : t('fleeCantTwice')
      : state.room.length !== 4
        ? t('fleeOnlyFullRoom')
        : '';
}

/** Shows/hides the full-screen Victory/Defeat banner based on state.gameOver
 * + state.outcome. Safe to call after every state change. */
function renderGameOverBanner() {
  const overlay = document.getElementById('gameover-overlay');

  if (!state.gameOver) {
    overlay.classList.add('hidden');
    overlay.classList.remove('gameover-won', 'gameover-lost');
    return;
  }

  overlay.classList.remove('hidden');
  overlay.classList.toggle('gameover-won', state.outcome === 'won');
  overlay.classList.toggle('gameover-lost', state.outcome === 'lost');
  document.getElementById('gameover-text').textContent =
    state.outcome === 'won' ? t('victory') : t('defeat');
}

// --- start-screen galleries (Champions/Weapons/Monsters) -------------------

/** Fills a portrait-shaped element (a gallery tile's image slot, the gallery
 * detail popup's big portrait, or a champion-select tile) with either real
 * artwork (an <img>) or, when none exists yet (image is null/undefined — as
 * of now every Champion, see js/champion-icons.js), a plain-letter
 * placeholder box. Same null-image fallback idea as fillCardFace()'s
 * suit-symbol fallback for cards — once a real image path is set on the
 * data, this starts showing it automatically. `letter` is only used for the
 * placeholder (pass the item's name's first letter). */
function fillPortrait(el, image, name, letter) {
  el.innerHTML = '';
  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = name || '';
    el.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'portrait-placeholder';
    placeholder.textContent = letter || '?';
    el.appendChild(placeholder);
  }
}

/** Builds one portrait+name+rank tile for #gallery-grid. Clicking it opens
 * the detail popup (see openGalleryDetail() in main.js) — `kind`/`key` are
 * stashed as dataset attributes so the click handler (delegated on
 * #gallery-grid) knows which item was clicked without needing a closure per
 * tile. `rankLabel` overrides the default "RANK_LABELS[key]" bottom line —
 * pass '' to omit it entirely (used for champions, which have no rank). */
function buildGalleryItem(kind, image, name, key, rankLabel) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.dataset.kind = kind;
  item.dataset.key = key;

  // Weapons, Shields, and Monsters all get the real in-game card frame
  // (see .gallery-item[data-kind='weapons']/[data-kind='shields']/
  // [data-kind='monsters'] in style.css) instead of the plain flat icon
  // tile — this needs two structural differences from the plain-tile
  // layout below, so all three are gated on the same flag.
  const usesCardFrame = kind === 'weapons' || kind === 'shields' || kind === 'monsters';

  const portrait = document.createElement('div');
  portrait.className = 'gallery-item-portrait';
  fillPortrait(portrait, image, name, (name || '?').charAt(0));
  // Positions the artwork over the illustrated frame's parchment box,
  // which needs the <img> wrapped in its own positioning div — an
  // absolutely positioned <img> sizes itself off its own intrinsic
  // pixels, not the inset box, so a non-replaced wrapper div is what
  // actually fills that box (same reasoning as .card-art/.card-image for
  // real cards).
  if (usesCardFrame) {
    const img = portrait.querySelector('img');
    if (img) {
      const artWrap = document.createElement('div');
      artWrap.className = 'gallery-item-art';
      portrait.appendChild(artWrap);
      artWrap.appendChild(img);
    }
  }
  item.appendChild(portrait);

  const nameEl = document.createElement('div');
  nameEl.className = 'gallery-item-name';
  nameEl.textContent = name || '';
  item.appendChild(nameEl);

  const label = rankLabel !== undefined ? rankLabel : RANK_LABELS[key];
  if (label) {
    const rankEl = document.createElement('div');
    rankEl.className = 'gallery-item-rank';
    rankEl.textContent = label;
    // Shows the value centered in the illustrated frame's hexagon, which
    // needs the rank nested inside the portrait (the element the frame
    // background/--art-*/--hex-* boxes live on) rather than sitting below
    // it as a plain sibling the way every other kind's rank line does.
    if (usesCardFrame) {
      portrait.appendChild(rankEl);
    } else {
      item.appendChild(rankEl);
    }
  }

  return item;
}

/** Fills #gallery-overlay for one of 'champions' / 'weapons' / 'monsters' /
 * 'shields'. Weapons/Monsters/Shields list every rank's artwork + flavor
 * name (same data as the card tooltips, see flavorNameFor() above);
 * Champions lists the fixed CHAMPIONS roster (js/champion-icons.js) instead
 * of a rank range. */
function renderGallery(kind) {
  const title = document.getElementById('gallery-title');
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';
  grid.classList.remove('hidden');
  // Champions get bigger, illustrated-card-frame tiles (see the
  // .gallery-grid--champions / .gallery-item[data-kind='champions'] rules in
  // style.css) — same frame art and aspect-ratio as the champion-select
  // screen, since Weapons/Monsters/Shields only ever need small icon tiles.
  grid.classList.toggle('gallery-grid--champions', kind === 'champions');
  // Weapons, Shields, and Monsters each get the same illustrated-card-frame
  // treatment as Champions, each with its own frame/positioning (see
  // .gallery-item[data-kind='weapons']/[data-kind='shields']/
  // [data-kind='monsters'] in style.css).
  grid.classList.toggle('gallery-grid--weapons', kind === 'weapons');
  grid.classList.toggle('gallery-grid--shields', kind === 'shields');
  grid.classList.toggle('gallery-grid--monsters', kind === 'monsters');

  if (kind === 'weapons') {
    title.textContent = t('galleryTitleWeapons');
    for (let rank = 2; rank <= 10; rank++) {
      grid.appendChild(
        buildGalleryItem('weapons', `images/weapons/${rank}.png`, weaponNameFor(rank), rank)
      );
    }
  } else if (kind === 'monsters') {
    title.textContent = t('galleryTitleMonsters');
    for (let rank = 2; rank <= 14; rank++) {
      grid.appendChild(
        buildGalleryItem('monsters', `images/monsters/${rank}.png`, monsterNameFor(rank), rank)
      );
    }
  } else if (kind === 'shields') {
    title.textContent = t('galleryTitleShields');
    for (let rank = 3; rank <= 5; rank++) {
      grid.appendChild(
        buildGalleryItem('shields', `images/shields/${rank}.png`, shieldNameFor(rank), rank)
      );
    }
  } else {
    title.textContent = t('galleryTitleChampions');
    CHAMPIONS.forEach((champ) => {
      grid.appendChild(buildGalleryItem('champions', champ.image, champ.name, champ.id, ''));
    });
  }
}

/** Fills #gallery-detail-overlay for one weapon/monster/shield/champion tile
 * clicked in the gallery (see openGalleryDetail() in main.js) — portrait,
 * name, and either "Strength N" + a flavor blurb (weapons/monsters/shields)
 * or the champion's passive-ability text. `key` is a rank number for
 * weapons/monsters/shields, or a champion id string for champions. */
function renderGalleryDetail(kind, key) {
  let image, name, description, subtitle;

  if (kind === 'weapons') {
    image = `images/weapons/${key}.png`;
    name = weaponNameFor(key);
    description = weaponDescriptionFor(key);
    subtitle = t('strengthLabel', { n: RANK_LABELS[key] });
  } else if (kind === 'monsters') {
    image = `images/monsters/${key}.png`;
    name = monsterNameFor(key);
    description = monsterDescriptionFor(key);
    subtitle = t('strengthLabel', { n: RANK_LABELS[key] });
  } else if (kind === 'shields') {
    image = `images/shields/${key}.png`;
    name = shieldNameFor(key);
    description = shieldDescriptionFor(key);
    // Shields block damage rather than dealing/healing it, so their number
    // is labeled "Block" here instead of "Strength" (unlike weapons/
    // monsters) — see js/shield-icons.js.
    subtitle = t('blockLabel', { n: RANK_LABELS[key] });
  } else {
    const champ = championById(key);
    image = champ ? champ.image : null;
    name = champ ? champ.name : '';
    description = champ ? champ.description : '';
    subtitle = t('passiveAbilityLabel');
  }

  const portrait = document.getElementById('gallery-detail-image');
  fillPortrait(portrait, image, name, (name || '?').charAt(0));

  document.getElementById('gallery-detail-title').textContent = name || '';
  document.getElementById('gallery-detail-rank').textContent = subtitle;
  document.getElementById('gallery-detail-text').textContent = description || '';
}

// --- champion-select screen (shown whenever a new game is started) ---------

/** Builds one selectable champion tile for #champion-select-grid — a bigger
 * cousin of a gallery tile that shows its full ability description inline
 * (only 4 champions exist, so there's no need for a separate detail popup
 * the way the Weapons/Monsters galleries have one). Clicking a tile starts
 * the game with that champion immediately (see the delegated click handler
 * in main.js) — no separate "confirm" step, same instant-choose feel as
 * clicking a weapon/potion card in-game. */
function buildChampionSelectItem(champ) {
  const item = document.createElement('div');
  item.className = 'champion-select-item';
  item.dataset.championId = champ.id;

  const portrait = document.createElement('div');
  portrait.className = 'champion-select-portrait';
  fillPortrait(portrait, champ.image, champ.name, champ.name.charAt(0));
  item.appendChild(portrait);

  const nameEl = document.createElement('div');
  nameEl.className = 'champion-select-name';
  nameEl.textContent = champ.name;
  item.appendChild(nameEl);

  const descEl = document.createElement('div');
  descEl.className = 'champion-select-desc';
  descEl.textContent = champ.description;
  item.appendChild(descEl);

  return item;
}

function renderChampionSelect() {
  const grid = document.getElementById('champion-select-grid');
  grid.innerHTML = '';
  CHAMPIONS.forEach((champ) => grid.appendChild(buildChampionSelectItem(champ)));
}

// --- language (see js/i18n.js for getLang()/setLang()/t()) -----------------

/** Applies the current language to every static piece of markup in
 * index.html — button labels, headings, aria-labels, and the #rules text —
 * via data-i18n/data-i18n-html/data-i18n-aria attributes set on those
 * elements. Called once on page load and again whenever the language is
 * switched from the Options screen (see applyLanguage() in js/main.js).
 * Doesn't touch anything already rendered from `state` (the room, HP bar,
 * weapon slot, etc.) — that's renderAll()'s job, called separately right
 * after this by applyLanguage(). */
function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
}

/** Highlights whichever of the two language buttons in #options-overlay
 * matches getLang(). Called from renderAll() (harmless before the overlay's
 * ever been opened) and right after a language switch. */
function renderLanguageButtons() {
  const lang = getLang();
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('lang-btn--active', btn.dataset.lang === lang);
  });
}

function renderAll() {
  renderLanguageButtons();
  renderChampionBadge();
  renderAbilityButton();
  renderAbilityInfo();
  renderManaRing();
  renderAbilityActiveGlow();
  renderChampionAbilityBar();
  renderHp();
  renderRoom();
  renderRogueTargeting(); // after renderRoom() — it needs the fresh #room card elements
  renderDeckCount();
  renderWeaponSlot();
  renderShieldSlot();
  renderFleeButton();
  renderMessage('');
  renderGameOverBanner();
}

// --- speedable animation helpers ---------------------------------------------
// Shared by every animation below. main.js serializes room-card actions
// through a queue (see enqueueRoomAction() there) so their animations never
// overlap — but a click that arrives while the previous one is still
// animating shouldn't just sit there waiting the full duration out. Instead
// the *currently playing* leg is nudged to finish in half its remaining
// time via speedUp(). Both helpers return a `{ speedUp }` controller;
// speedUp() is safe to call more than once (only the first call does
// anything) and safe to call after the animation already finished (a no-op).

/** Drives one CSS transform/opacity transition on `el` toward the given
 * target value(s) over `durationMs`, then calls onDone(). speedUp() snaps
 * `el` to wherever the transition has visually reached so far (via its
 * computed style) and restarts it toward the same target in half the
 * remaining time — so speeding up never causes a visual jump. */
function animateTransform(el, { transform, opacity }, durationMs, easing, onDone) {
  const start = Date.now();
  let sped = false;
  let timeoutId;

  function setTransition(ms) {
    const props = [];
    if (transform !== undefined) props.push(`transform ${ms}ms ${easing}`);
    if (opacity !== undefined) props.push(`opacity ${ms}ms ${easing}`);
    el.style.transition = props.join(', ');
  }

  function setTarget() {
    if (transform !== undefined) el.style.transform = transform;
    if (opacity !== undefined) el.style.opacity = opacity;
  }

  setTransition(durationMs);
  requestAnimationFrame(setTarget);
  timeoutId = setTimeout(onDone, durationMs);

  return {
    speedUp() {
      if (sped) return;
      sped = true;

      const remaining = Math.max(0, durationMs - (Date.now() - start));
      if (remaining <= 0) return; // already about to finish on its own

      clearTimeout(timeoutId);

      // Snap to the current mid-transition visual state, then resume toward
      // the same target in half the remaining time.
      const computed = getComputedStyle(el);
      el.style.transition = 'none';
      if (transform !== undefined) el.style.transform = computed.transform;
      if (opacity !== undefined) el.style.opacity = computed.opacity;
      void el.offsetWidth; // force reflow so the 'none' transition commits

      const newDuration = remaining / 2;
      setTransition(newDuration);
      requestAnimationFrame(setTarget);
      timeoutId = setTimeout(onDone, newDuration);
    },
  };
}

/** Same idea as animateTransform(), but for a plain delay with no CSS
 * transition of its own (e.g. a pause between two animation legs, or the
 * wait before re-rendering the room after a card fades out). */
function speedableTimeout(fn, delayMs) {
  const start = Date.now();
  let sped = false;
  let timeoutId = setTimeout(fn, delayMs);
  return {
    speedUp() {
      if (sped) return;
      sped = true;
      clearTimeout(timeoutId);
      const remaining = Math.max(0, delayMs - (Date.now() - start));
      timeoutId = setTimeout(fn, remaining / 2);
    },
  };
}

// --- weapon-equip animation -------------------------------------------------

// Keep in sync with the transition duration set on .weapon-flying in style.css.
const WEAPON_FLY_MS = 380;

/** Animates a clone of `cardEl` flying from its current position into the
 * weapon slot, then calls onDone(). The original card is hidden immediately
 * so nothing appears duplicated during the flight. Returns a `{ speedUp }`
 * controller (see animateTransform above). */
function animateWeaponToSlot(cardEl, onDone) {
  const slot = document.getElementById('weapon-slot-card');
  const startRect = cardEl.getBoundingClientRect();
  const endRect = slot.getBoundingClientRect();

  const clone = cardEl.cloneNode(true);
  clone.classList.add('weapon-flying');
  // The clone is a flying phantom, not a clickable target any more (the
  // player already clicked the real card, which is about to be hidden
  // below) — strip .tutorial-target if it was on the original. Left on, its
  // `position: relative` (see style.css) would win over .weapon-flying's
  // `position: fixed` (both single-class selectors, so whichever rule comes
  // later in the stylesheet wins), knocking the clone out of `position:
  // fixed` and into normal document flow at the bottom of <body> instead of
  // flying as an overlay — which is exactly what caused the equip animation
  // to silently not play and a scrollbar/page-jump to flash briefly while
  // the oversized in-flow clone existed.
  clone.classList.remove('tutorial-target');
  clone.style.left = `${startRect.left}px`;
  clone.style.top = `${startRect.top}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  document.body.appendChild(clone);

  cardEl.style.visibility = 'hidden';

  const dx = endRect.left + (endRect.width - startRect.width) / 2 - startRect.left;
  const dy = endRect.top + (endRect.height - startRect.height) / 2 - startRect.top;
  const scale = endRect.width / startRect.width;

  return animateTransform(
    clone,
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: '0.4' },
    WEAPON_FLY_MS,
    'ease',
    () => {
      clone.remove();
      onDone();
    }
  );
}

/** Same idea as animateWeaponToSlot(), but flies a clone of `cardEl` into the
 * shield slot instead — used when a shield card is clicked (see
 * js/main.js). Shares WEAPON_FLY_MS so both slots' equip animations feel
 * identical. */
function animateShieldToSlot(cardEl, onDone) {
  const slot = document.getElementById('shield-slot-card');
  const startRect = cardEl.getBoundingClientRect();
  const endRect = slot.getBoundingClientRect();

  const clone = cardEl.cloneNode(true);
  clone.classList.add('weapon-flying');
  clone.classList.remove('tutorial-target'); // see animateWeaponToSlot() above for why
  clone.style.left = `${startRect.left}px`;
  clone.style.top = `${startRect.top}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  document.body.appendChild(clone);

  cardEl.style.visibility = 'hidden';

  const dx = endRect.left + (endRect.width - startRect.width) / 2 - startRect.left;
  const dy = endRect.top + (endRect.height - startRect.height) / 2 - startRect.top;
  const scale = endRect.width / startRect.width;

  return animateTransform(
    clone,
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: '0.4' },
    WEAPON_FLY_MS,
    'ease',
    () => {
      clone.remove();
      onDone();
    }
  );
}

// --- shield-block feedback ---------------------------------------------------
// Two different reactions when a shield absorbs damage (js/state.js
// fightMonster()), depending on whether it survives: a small shake if it's
// still standing (reuses .card--shake, same wobble as a monster weakened by
// the Electric weapon effect), or a full shatter if the hit broke it.

/** Plays the shield slot's "took damage but survived" shake. Called after
 * renderShieldSlot() has already drawn the shield's new (lower) durability,
 * so the shake plays on top of the up-to-date card face. The animation
 * itself ends back at rest (see @keyframes card-shake in style.css, no
 * `infinite`), so there's nothing to clean up afterwards. */
function animateShieldShake() {
  const slot = document.getElementById('shield-slot-card');
  // Restart the animation even if it's still mid-shake from a previous hit
  // (classList.add alone wouldn't retrigger a CSS animation that's already
  // applied) by removing and re-adding on the next frame.
  slot.classList.remove('card--shake');
  void slot.offsetWidth; // force reflow so the removal actually takes effect
  slot.classList.add('card--shake');
}

const SLOT_SHATTER_MS = 650;
const SLOT_SHATTER_SHARDS = 6;

/** Shared by animateShieldShatter() and animateWeaponShatter() below: clones
 * `slotId`'s current card face (before the caller overwrites it with the
 * now-empty slot) into several pie-slice shards that fly outward and fade,
 * then calls `onDone()` once they're gone so the caller can re-render the
 * slot to its real (empty) state underneath. Must be called BEFORE that
 * re-render, so the shards still show the equipped item's artwork, not a
 * blank placeholder. Originally written just for shields; generalized to
 * take a slot id once weapons needed the exact same "breaks and shatters"
 * feedback for the Fragile weapon effect (see js/weapon-effects.js).
 * Nothing here is shield- or weapon-specific beyond which element it clones. */
function animateSlotShatter(slotId, onDone) {
  const slot = document.getElementById(slotId);
  const rect = slot.getBoundingClientRect();

  const container = document.createElement('div');
  container.className = 'card-shatter-container';
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.width = `${rect.width}px`;
  container.style.height = `${rect.height}px`;

  const angleStep = (2 * Math.PI) / SLOT_SHATTER_SHARDS;
  for (let i = 0; i < SLOT_SHATTER_SHARDS; i++) {
    const shard = slot.cloneNode(true);
    shard.removeAttribute('id'); // avoid a duplicate #<slotId> while shards are in the DOM
    shard.classList.add('card-shard');

    // Clip this shard to one pie slice of the card, from the center out —
    // together all slices reconstruct the whole card face. The radius
    // overshoots 50% so slices still cover the card's corners.
    const a0 = i * angleStep - Math.PI / 2;
    const a1 = (i + 1) * angleStep - Math.PI / 2;
    const r = 80;
    const x0 = (50 + r * Math.cos(a0)).toFixed(1);
    const y0 = (50 + r * Math.sin(a0)).toFixed(1);
    const x1 = (50 + r * Math.cos(a1)).toFixed(1);
    const y1 = (50 + r * Math.sin(a1)).toFixed(1);
    shard.style.clipPath = `polygon(50% 50%, ${x0}% ${y0}%, ${x1}% ${y1}%)`;

    // Fly outward along this slice's own bisector, with a bit of random
    // spin per shard so the break doesn't look too mechanically even.
    const mid = (a0 + a1) / 2;
    shard.style.setProperty('--shatter-dx', `${(Math.cos(mid) * 55).toFixed(1)}px`);
    shard.style.setProperty('--shatter-dy', `${(Math.sin(mid) * 55).toFixed(1)}px`);
    shard.style.setProperty('--shatter-rot', `${(Math.random() * 70 - 35).toFixed(1)}deg`);
    shard.style.animationDelay = `${i * 12}ms`;

    container.appendChild(shard);
  }

  document.body.appendChild(container);
  slot.style.visibility = 'hidden';

  setTimeout(() => {
    container.remove();
    slot.style.visibility = '';
    onDone();
  }, SLOT_SHATTER_MS);
}

/** Plays the shield slot's "broke" shatter, see animateSlotShatter() above. */
function animateShieldShatter(onDone) {
  animateSlotShatter('shield-slot-card', onDone);
}

/** Plays the weapon slot's "broke" shatter, for a Fragile weapon that just
 * ran out of uses (see js/weapon-effects.js and breakFragileWeapon() in
 * js/state.js). See animateSlotShatter() above. Callers must wait until any
 * in-flight weapon-attack swing (animateWeaponAttack() below) has fully
 * returned to the slot before calling this, or the shards would be clipped
 * from the slot's mid-swing, off-position transform instead of its resting
 * card face. */
function animateWeaponShatter(onDone) {
  animateSlotShatter('weapon-slot-card', onDone);
}

// --- weapon-attack animation -------------------------------------------------

// Total ~1.5s, split into three legs so it reads as one fluid swing rather
// than a linear slide: swing out to the monster (ease-in, gathering speed), a
// brief pause right on impact, then swing back into the weapon slot
// (ease-out, settling in). Driven by transform transitions rather than a
// fixed @keyframes animation because the start (weapon slot) and end (the
// clicked monster card) positions are measured at runtime and differ every
// time.
const WEAPON_ATTACK_OUT_MS = 600;
const WEAPON_ATTACK_IMPACT_MS = 113;
const WEAPON_ATTACK_RETURN_MS = 788;

/** Animates the actual equipped-weapon card (not a clone) flying out of the
 * weapon slot to strike `monsterEl`, then flying back into the slot — about
 * 1.5 seconds total. Moving the real element (rather than a cloned stand-in
 * left floating over the slot) means there's never a duplicate card visible
 * anywhere — the slot is simply empty-looking for the instant its card is
 * "out" fighting. `onImpact()` fires the moment the weapon visually lands
 * on the monster, so the caller can apply the actual state change (HP loss,
 * message, card fade-out) right as the "hit" happens. Note `onImpact` is
 * expected to call renderWeaponSlot(), which rewrites the slot's className/
 * innerHTML — that's fine, since only inline styles (position/z-index/
 * transform/transition, set directly here rather than via a CSS class) need
 * to survive across it. `onDone()` fires once the card has fully returned
 * and every inline style set here has been cleaned up.
 *
 * Returns a `{ speedUp }` controller: calling it fast-forwards whichever leg
 * (out / impact pause / return) is currently playing to finish in half its
 * remaining time, and — once called — every later leg of this same swing
 * also starts pre-sped-up, so the rest of the swing plays out at double
 * speed instead of just the one leg that happened to be active. */
function animateWeaponAttack(monsterEl, onImpact, onDone = () => {}) {
  const slot = document.getElementById('weapon-slot-card');
  const slotRect = slot.getBoundingClientRect();
  const targetRect = monsterEl.getBoundingClientRect();

  const dx = targetRect.left + targetRect.width / 2 - (slotRect.left + slotRect.width / 2);
  const dy = targetRect.top + targetRect.height / 2 - (slotRect.top + slotRect.height / 2);

  // Lift the slot above surrounding UI while it's flying, without disturbing
  // the space it normally occupies (transform doesn't affect layout flow).
  slot.style.position = 'relative';
  slot.style.zIndex = '60';

  let current = null;
  let speedRequested = false;

  // Leg 1: swing out and strike the monster — a slight rotation + scale-up
  // reads as a swing/lunge rather than the weapon just sliding across.
  current = animateTransform(
    slot,
    { transform: `translate(${dx}px, ${dy}px) rotate(-16deg) scale(1.08)` },
    WEAPON_ATTACK_OUT_MS,
    'cubic-bezier(0.55, 0, 0.85, 0.35)',
    () => {
      onImpact();

      current = speedableTimeout(() => {
        // Leg 2: swing back into the weapon slot.
        current = animateTransform(
          slot,
          { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
          WEAPON_ATTACK_RETURN_MS,
          'cubic-bezier(0.2, 0.65, 0.3, 1)',
          () => {
            slot.style.transition = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.position = '';
            current = null;
            onDone();
          }
        );
        if (speedRequested) current.speedUp();
      }, WEAPON_ATTACK_IMPACT_MS);
      if (speedRequested) current.speedUp();
    }
  );

  return {
    speedUp() {
      speedRequested = true;
      if (current) current.speedUp();
    },
  };
}
