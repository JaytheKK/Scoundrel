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
    const icon = document.createElement('img');
    icon.className = 'card-effect-badge-icon';
    icon.src = effect.image;
    icon.alt = effect.name;
    badge.appendChild(icon);
    badge.title = `${effect.name}: ${effect.description}`;
    el.appendChild(badge);
  }
  // Ranged weapons (SUITS.RANGED) deliberately show no corner badge — tried
  // as a reuse of the rolled-weapon-effect badge slot with an arrow icon,
  // removed by request. The ammo bar under the weapon slot (see
  // renderWeaponUsesBar()) is the only "this is a ranged weapon" cue now.

  const value = document.createElement('div');
  value.className = 'card-value-label';
  value.textContent = card.rank;
  el.appendChild(value);
}

/** Strength tier (1 weakest - 5 strongest) for a card's rank, used to scale
 * the border/glow treatment in style.css (.card--tier-N). Weapons/potions
 * only go up to rank 10, so they naturally top out around tier 3 — only a
 * monster can reach tier 4/5. */
// Thresholds are the ×5-rescaled rank values (see the "Value rescale" note
// in js/cards.js) — old 14/11/8/5 is now 70/55/40/25.
function cardTier(rank) {
  if (rank >= 70) return 5;
  if (rank >= 55) return 4;
  if (rank >= 40) return 3;
  if (rank >= 25) return 2;
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
  // Ranged/Mage weapons (SUITS.RANGED/SUITS.MAGE) share type 'weapon' with
  // melee (DIAMONDS), but their ranks overlap melee's — checked first, via
  // card.suit, or e.g. a rank-30 Mage Staff (Apprentice Wand) would show the
  // melee name for that same rank (Battle Axe) instead. See "Ranged
  // Weapons"/"Mage Staffs" in CLAUDE.md.
  if (card.type === 'weapon') {
    if (card.suit === SUITS.RANGED) return rangedWeaponNameFor(card.baseRank);
    if (card.suit === SUITS.MAGE) return mageWeaponNameFor(card.baseRank);
    return weaponNameFor(card.baseRank);
  }
  if (card.type === 'shield') return shieldNameFor(card.baseRank);
  return null;
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

/** Builds the text for a card's custom hover tooltip (see #card-tooltip
 * below): its flavor name, never the underlying poker-card name ("8 of
 * Hearts") — falls back to that only for a hypothetical card with no
 * flavor name at all (doesn't happen for any real card today) — plus its
 * rolled effect's name in parentheses, if it has one. Shared by renderCard()
 * and the equipped-weapon/shield slots (renderWeaponSlot()/
 * renderShieldSlot()), so all three read from the same one place. */
function cardTooltipText(card) {
  const name = flavorNameFor(card) || card.name;
  const effect = card.effect && WEAPON_EFFECTS[card.effect];
  return effect ? `${name} (${effect.name})` : name;
}

/** The fuller flavor blurb shown on a card's flipped-over back face (see
 * "Card flip (description back face)" in CLAUDE.md and flipCard() further
 * down) — a different, longer text from cardTooltipText() above, which only
 * shows the short flavor name on hover. Reads from whichever description
 * table matches the card's type (monsterDescriptionFor()/
 * potionDescriptionFor()/weaponDescriptionFor()/
 * rangedWeaponDescriptionFor()/shieldDescriptionFor()), keyed off
 * `baseRank` like flavorNameFor() above so a weakened monster still shows
 * its own real description. Appends the ammo-count sentence for a Ranged
 * weapon, same as the old Weapons gallery's detail popup used to. */
function cardDescriptionText(card) {
  if (card.type === 'monster') return monsterDescriptionFor(card.baseRank);
  if (card.type === 'potion') return potionDescriptionFor(card.baseRank);
  if (card.type === 'weapon') {
    if (card.suit === SUITS.RANGED) {
      return `${rangedWeaponDescriptionFor(card.baseRank)} ${t('rangedAmmoSentence', { n: RANGED_AMMO_MAX })}`;
    }
    if (card.suit === SUITS.MAGE) {
      return `${mageWeaponDescriptionFor(card.baseRank)} ${t('mageManaSentence', { n: MAGE_MANA_COST })}`;
    }
    return weaponDescriptionFor(card.baseRank);
  }
  if (card.type === 'shield') return shieldDescriptionFor(card.baseRank);
  return null;
}

/** Builds the small "damage you'd take" line shown under a monster card's
 * hover tooltip (see showCardTooltip() below), from previewMonsterDamage()
 * in js/state.js, a live, read-only preview that already accounts for an
 * equipped weapon, Berserker/Paladin/Frenzy, and a shield, exactly as a
 * real fight would. Returns null for a monster that can currently be
 * fought for 0 damage AND has no shield in play (nothing useful to show).
 * Layout, by request:
 *   - no shield: just the damage in red, e.g. "-15".
 *   - shield blocks everything: just the blocked amount in gray
 *     parentheses, e.g. "(-18)", no red number, since 0 HP would be lost.
 *   - shield blocks only part: the blocked amount in gray parentheses
 *     followed by the actual HP loss in red, e.g. "(-18) -15".
 *   - Vampiric heal (if the equipped weapon would trigger it this swing):
 *     a "+1" in green, appended after the above. */
function buildDamagePreviewEl(card) {
  const { blocked, finalDamage, vampiric } = previewMonsterDamage(card);
  if (blocked <= 0 && finalDamage <= 0 && !vampiric) return null;

  const wrap = document.createElement('div');
  wrap.className = 'tooltip-damage';

  if (blocked > 0) {
    const blockedEl = document.createElement('span');
    blockedEl.className = 'tooltip-damage-blocked';
    blockedEl.textContent = `(-${blocked})`;
    wrap.appendChild(blockedEl);
  }
  if (blocked <= 0 || finalDamage > 0) {
    const dmgEl = document.createElement('span');
    dmgEl.className = 'tooltip-damage-final';
    dmgEl.textContent = `-${finalDamage}`;
    wrap.appendChild(dmgEl);
  }
  if (vampiric) {
    const vampEl = document.createElement('span');
    vampEl.className = 'tooltip-damage-vamp';
    vampEl.textContent = '+1';
    wrap.appendChild(vampEl);
  }
  return wrap;
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = `card card--${card.type} card--tier-${cardTier(card.rank)}`;
  el.dataset.suit = card.suit;
  el.dataset.id = card.id;
  applyGlowColor(el, card);
  // A plain `data-tooltip` attribute, not the browser's native `title` —
  // read by the custom #card-tooltip popup (see showCardTooltip() below)
  // instead, so the name shows in the game's own styled bubble rather than
  // the browser's default tooltip box.
  el.dataset.tooltip = cardTooltipText(card);
  // Right-click / long-press flip target (see flipCard() further down) —
  // data-flip-desc is what the delegated listeners in js/main.js actually
  // key off (a card with no description, if that ever happens, simply
  // never flips); data-flip-name is just the heading shown above it.
  el.dataset.flipName = flavorNameFor(card) || card.name;
  el.dataset.flipDesc = cardDescriptionText(card) || '';
  fillCardFace(el, card);
  return el;
}

/** Persistent mapping from the 4 fixed visual positions in the phone-tier
 * 2x2 room grid (the max-width:639px/min-height:650px media query in
 * style.css) to whichever card currently occupies each one, or null for an
 * empty slot. Only read/written while that grid is actually active, see
 * renderRoom() below, the normal single-row layout ignores this entirely
 * and just renders state.room directly in order, exactly as before this
 * existed.
 *
 * By request: in the 2x2 grid, resolving a card should leave that slot
 * visibly empty rather than letting the other cards reflow to close the
 * gap, and a room refill should fill the new cards into whichever slots
 * are empty instead of restacking everything from scratch (both of which
 * happened before, since renderRoom() always just rebuilt #room from
 * state.room's current order). Tracked by object reference, not card.id,
 * specifically so a brand new game (initGame() hands out all-new card
 * objects via getFreshDeck(), even though the same id strings, e.g.
 * "diamonds-30", can recur across games) can never confuse a leftover slot
 * from the previous game with a same-named card in the new one:
 * updateRoomSlots() below clears any slot whose card object isn't found
 * by reference in the current state.room, which a previous game's cards
 * never are, so nothing needs to explicitly reset this array on New Game
 * or Play Again. */
let roomSlots = [null, null, null, null];

/** Reconciles roomSlots (see above) against the live state.room array: any
 * slot whose card is no longer present in state.room is cleared first (the
 * card was resolved, or the whole room changed at once, e.g. a flee or a
 * new game), then any state.room card that isn't already occupying a slot
 * is placed into the first empty slot, in state.room's own order. Called
 * only from renderRoom() while the 2x2 grid tier is active. */
function updateRoomSlots(roomCards) {
  const stillPresent = new Set(roomCards);
  for (let i = 0; i < roomSlots.length; i++) {
    if (roomSlots[i] && !stillPresent.has(roomSlots[i])) {
      roomSlots[i] = null;
    }
  }
  const alreadySlotted = new Set(roomSlots.filter(Boolean));
  roomCards.forEach((card) => {
    if (alreadySlotted.has(card)) return;
    const emptyIndex = roomSlots.indexOf(null);
    if (emptyIndex === -1) {
      // Should never happen (the room never holds more than 4 cards at
      // once), but don't silently drop a card if it somehow does.
      roomSlots.push(card);
    } else {
      roomSlots[emptyIndex] = card;
    }
    alreadySlotted.add(card);
  });
}

/** When there's no active room (before the first game, or once the dungeon
 * is fully cleared/lost), show a "New Game" call-to-action in its place
 * instead of leaving the room area blank. */
function renderRoom() {
  // The room's cards are about to be torn down and rebuilt from scratch, so
  // any element the tooltip is currently anchored to (its dataset.tooltip
  // attribute lives on the card element itself) is about to go stale or
  // detached — hide it rather than leave it floating over nothing, or over
  // a brand-new card it was never actually shown for. See showCardTooltip()/
  // hideCardTooltip() further down.
  hideCardTooltip();
  // Same reasoning for an open card flip (see closeCardFlipImmediate() in
  // this file) — a flipped room card's DOM structure is about to be wiped
  // out by the innerHTML reset below either way.
  closeCardFlipImmediate();
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

  // The phone-tier 2x2 grid keeps every card in its own fixed slot instead
  // of reflowing the remaining cards whenever one resolves, see
  // updateRoomSlots() above for why. Reading #room's own computed display
  // (rather than re-encoding that media query's breakpoint here too) keeps
  // this in sync with style.css automatically. Any other layout (the
  // normal single-row room) skips all of this and renders state.room
  // directly, exactly as before that grid existed.
  if (getComputedStyle(roomEl).display === 'grid') {
    updateRoomSlots(state.room);
    roomSlots.forEach((card) => {
      if (card) {
        roomEl.appendChild(renderCard(card));
      } else {
        // Reserves the same grid cell a card would occupy, but with
        // nothing shown and no interaction, see .room-slot-empty in
        // style.css.
        const placeholder = document.createElement('div');
        placeholder.className = 'room-slot-empty';
        roomEl.appendChild(placeholder);
      }
    });
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
 * reduced-damage hits), Berserker's berserkerFrenzyCharges (counts down
 * as his bare-handed fights take boosted damage reduction, see
 * fightMonster() in js/state.js), or Sword Master's swordmasterMasteryCharges
 * (counts down as his weapon ignores its degrade limit, see fightMonster()
 * in js/state.js) — either way the glow disappears the
 * instant its counter hits 0. Lives on #ability-wrap rather than
 * #ability-btn itself — see the
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
    (state.champion === 'berserker' && state.berserkerFrenzyCharges > 0) ||
    (state.champion === 'swordmaster' && state.swordmasterMasteryCharges > 0);
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

/** Syncs #weapon-toggle's checked state to state.useWeaponPreference.
 * Normally the checkbox is the only thing that ever writes that field (its
 * own change listener in js/main.js), so nothing needed to sync it back the
 * other way — but Berserker's active ability now also writes it directly
 * (forced off the instant Frenzy activates, forced back on the instant its
 * charges run out, see useAbility()/fightMonster() in js/state.js), so the
 * checkbox needs to be told about that. Called from renderAll() and
 * anywhere state.useWeaponPreference can change programmatically (the
 * ability button's click handler and applyResolve(), both in js/main.js). */
function renderWeaponToggle() {
  document.getElementById('weapon-toggle').checked = state.useWeaponPreference;
}

function renderWeaponSlot() {
  const slot = document.getElementById('weapon-slot-card');
  const status = document.getElementById('weapon-status');

  // Same reasoning as renderRoom()'s hideCardTooltip() call — this slot's
  // own element is about to be repainted (a new weapon, or back to empty),
  // so any tooltip currently anchored to it would otherwise be left
  // showing stale or leftover text.
  hideCardTooltip();
  closeCardFlipImmediate();

  if (!state.equippedWeapon) {
    slot.className = 'card weapon-slot-empty';
    slot.style.removeProperty('--edge-rgb');
    delete slot.dataset.suit;
    delete slot.dataset.tooltip;
    delete slot.dataset.flipName;
    delete slot.dataset.flipDesc;
    slot.innerHTML = '<img class="slot-icon" src="images/symbols/SwordSymbolTransparent.png" alt="">';
  } else {
    slot.className = `card card--weapon card--tier-${cardTier(state.equippedWeapon.rank)}`;
    slot.dataset.suit = state.equippedWeapon.suit;
    slot.dataset.tooltip = cardTooltipText(state.equippedWeapon);
    slot.dataset.flipName = flavorNameFor(state.equippedWeapon) || state.equippedWeapon.name;
    slot.dataset.flipDesc = cardDescriptionText(state.equippedWeapon) || '';
    applyGlowColor(slot, state.equippedWeapon);
    fillCardFace(slot, state.equippedWeapon);
  }

  // Grayed out whenever the toggle is off, so it's visually obvious you're
  // fighting bare-handed right now regardless of what's equipped.
  slot.classList.toggle('weapon-slot-inactive', !state.useWeaponPreference);
  // A lighter, separate grayscale for a Mage Staff specifically when there
  // isn't enough banked mana to fire it right now (see MAGE_MANA_COST/
  // isWeaponUsableOn() in js/state.js) — deliberately its own class rather
  // than reusing weapon-slot-inactive above, since the two convey different
  // things (toggled off entirely, vs. this weapon just can't be used THIS
  // moment) and can independently apply at once.
  const mageOutOfMana =
    state.equippedWeapon &&
    state.equippedWeapon.suit === SUITS.MAGE &&
    state.mana < MAGE_MANA_COST;
  slot.classList.toggle('weapon-slot-no-mana', !!mageOutOfMana);

  if (!state.useWeaponPreference) {
    status.textContent = t('fightingBareHanded');
  } else if (!state.equippedWeapon) {
    status.textContent = t('noWeaponEquipped');
  } else if (state.equippedWeapon.suit === SUITS.RANGED) {
    // Ranged weapons ignore the degrade rule entirely (see
    // isWeaponUsableOn() in js/state.js) and never carry a rolled weapon
    // effect (see rollWeaponEffects() in js/weapon-effects.js), so neither
    // of the two pieces the melee branch below shows applies here — just
    // the ammo count, which the bar under the slot also shows visually.
    status.textContent = t('rangedWeaponStatus', {
      filled: Math.max(0, state.weaponAmmoRemaining),
      total: RANGED_AMMO_MAX,
    });
  } else if (state.equippedWeapon.suit === SUITS.MAGE) {
    // Mage Staffs also ignore the degrade rule and never carry a rolled
    // weapon effect (same reasoning as Ranged above) — instead of an ammo
    // count, this shows whether there's currently enough of the SHARED mana
    // pool banked to fire it (see mageOutOfMana above).
    status.textContent = mageOutOfMana
      ? t('mageWeaponStatusNoMana', { n: MAGE_MANA_COST })
      : t('mageWeaponStatus', { n: MAGE_MANA_COST });
  } else {
    // Sword Master's Weapon Mastery (see fightMonster()/isWeaponUsableOn()
    // in js/state.js) lifts the degrade restriction entirely while active —
    // reflect that here too, so this line doesn't keep claiming a
    // restriction that currently doesn't apply.
    const mastered = state.champion === 'swordmaster' && state.swordmasterMasteryCharges > 0;
    const restriction =
      mastered
        ? t('masteryOverrides', { n: state.swordmasterMasteryCharges })
        : state.weaponMaxMonster === null
          ? t('canDefeatAny')
          : t('canOnlyDefeatWeaker', { n: state.weaponMaxMonster });
    const effect = state.equippedWeapon.effect && WEAPON_EFFECTS[state.equippedWeapon.effect];
    status.textContent = effect ? `${restriction}. ${effect.name}: ${effect.description}` : restriction;
  }

  renderWeaponUsesBar();
}

/** Fills #weapon-fragile-bar (id kept from when this only handled Fragile —
 * see below) with one segment per remaining use, mirroring
 * renderChampionAbilityBar()'s discrete filled/unfilled segments (same CSS
 * classes, .ability-segment/.ability-segment--filled, just a second bar
 * instance). Covers TWO distinct "this weapon breaks after N uses" cases
 * that can never both apply at once (see rollWeaponEffects() in
 * js/weapon-effects.js): a Fragile melee weapon
 * (state.weaponFragileUsesRemaining, counts down to 0 over FRAGILE_MAX_USES
 * fights) and a Ranged weapon (state.weaponAmmoRemaining, counts down over
 * RANGED_AMMO_MAX shots, see "Ranged Weapons" in CLAUDE.md) — full when
 * freshly equipped either way, one segment drains per use, hidden entirely
 * for a plain melee weapon (no effect) or no weapon at all. Called from
 * renderWeaponSlot() itself (not a separate call site to remember) so it
 * can never drift out of sync with whichever weapon is currently equipped. */
function renderWeaponUsesBar() {
  const bar = document.getElementById('weapon-fragile-bar');
  const weapon = state.equippedWeapon;
  const isFragile = weapon && weapon.effect === 'fragile';
  const isRanged = weapon && weapon.suit === SUITS.RANGED;

  if (!isFragile && !isRanged) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    bar.title = '';
    return;
  }

  const total = isRanged ? RANGED_AMMO_MAX : FRAGILE_MAX_USES;
  const remaining = isRanged ? state.weaponAmmoRemaining : state.weaponFragileUsesRemaining;
  const filled = Math.max(0, remaining);
  bar.classList.remove('hidden');
  bar.title = t(isRanged ? 'ammoBarTitle' : 'fragileBarTitle', { filled, total });
  bar.innerHTML = '';
  for (let i = 0; i < total; i++) {
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

  // See the matching call in renderWeaponSlot() above.
  hideCardTooltip();
  closeCardFlipImmediate();

  if (!state.equippedShield) {
    slot.className = 'card shield-slot-empty';
    slot.style.removeProperty('--edge-rgb');
    delete slot.dataset.suit;
    delete slot.dataset.tooltip;
    delete slot.dataset.flipName;
    delete slot.dataset.flipDesc;
    slot.innerHTML = '<img class="slot-icon" src="images/symbols/ShieldSymbolTransparent.png" alt="">';
  } else {
    const shield = state.equippedShield;
    slot.className = `card card--shield card--tier-${cardTier(shield.rank)}`;
    slot.dataset.suit = shield.suit;
    slot.dataset.tooltip = cardTooltipText(shield);
    slot.dataset.flipName = flavorNameFor(shield) || shield.name;
    slot.dataset.flipDesc = cardDescriptionText(shield) || '';
    applyGlowColor(slot, shield);
    fillCardFace(slot, shield);
  }
}

/** Positions and shows #card-tooltip below `el` (or above, if there isn't
 * enough room underneath it, e.g. a card in the bottom row of the phone-tier
 * 2x2 grid), centered horizontally on it and clamped so it never runs off
 * the left/right edge of the viewport, same approach as
 * positionCoachmarkNear() in js/tutorial.js. Reads the name/effect text
 * from el.dataset.tooltip, set by renderCard()/renderWeaponSlot()/
 * renderShieldSlot() via cardTooltipText() above. This is a custom, styled
 * popup (see #card-tooltip in style.css) rather than the browser's own
 * default title-attribute tooltip, so it can match the game's own theme
 * and fonts. Wired up from js/main.js via a delegated hover listener. */
function showCardTooltip(el) {
  const text = el.dataset.tooltip;
  if (!text) return;

  const tooltip = document.getElementById('card-tooltip');
  tooltip.innerHTML = '';
  const nameEl = document.createElement('div');
  nameEl.className = 'tooltip-name';
  nameEl.textContent = text;
  tooltip.appendChild(nameEl);

  // Damage preview: only for a monster card actually still in the room
  // (not the equipped-weapon/shield slots, which also use this same
  // tooltip for their own name text). Looked up fresh by id every time
  // this shows, rather than cached, so it always reflects the current
  // weapon/shield/champion-charge state exactly as a real fight would.
  if (el.classList.contains('card--monster')) {
    const card = state.room.find((c) => c.id === el.dataset.id);
    if (card) {
      const preview = buildDamagePreviewEl(card);
      if (preview) tooltip.appendChild(preview);
    }
  }

  tooltip.classList.remove('hidden');

  const rect = el.getBoundingClientRect();
  const ttRect = tooltip.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - ttRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - ttRect.width - 8));

  let top = rect.bottom + 10;
  if (top + ttRect.height > window.innerHeight - 8) top = rect.top - ttRect.height - 10;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideCardTooltip() {
  document.getElementById('card-tooltip').classList.add('hidden');
}

// --- card flip (description back face) --------------------------------------
// Right-click (desktop) or a long press (touch, where there's no right-click
// — see the delegated contextmenu/touch listeners in js/main.js) on ANY
// card-shaped element carrying data-flip-desc flips it in place to reveal
// its full flavor description on the back, per explicit request ("Die Karte
// soll dann sich umdrehen, eine Flip Animation... wichtig weil wir später
// wichtige Beschreibungen brauchen. In-Game soll das auch gehen"). Wired up
// on real room cards (renderCard()), the equipped weapon/shield slots
// (renderWeaponSlot()/renderShieldSlot()), and Deckbuilder tiles
// (buildDeckbuilderWeaponTile()) — see CLAUDE.md's "Card flip (description
// back face)" for the full write-up. Deliberately NOT added to the
// Monsters/Shields/Champions galleries, which already have their own
// working "click a tile to see its description" flow (the detail popup,
// see renderGalleryDetail()) that this doesn't need to replace.

// Kept in sync with .card-flip-inner's transition-duration in style.css —
// same "one JS constant matching one CSS duration" pattern as
// CARD_ANIMATION_MS in js/main.js.
const CARD_FLIP_MS = 500;

// The single currently-open flip, or null — only one card can be examined
// at a time; a second right-click/long-press elsewhere while one is already
// open is a no-op (see flipCard()) rather than silently closing the first,
// since that risked feeling accidental. { el, wrapper, inner } — el is the
// real card element itself (NOT a clone, see flipCard() below for why),
// temporarily relocated inside wrapper/inner; wrapper is the new static
// container flipCard() left at el's original spot in the DOM/layout.
let activeCardFlip = null;

/** Moves el back out of the flip structure to exactly where it was before
 * flipCard() touched it (right before `wrapper`, then wrapper itself is
 * discarded) and drops el's `.card-flip-face` marker class. Shared by
 * closeCardFlip() (once the closing animation has actually finished) and
 * closeCardFlipImmediate() (right away, no animation). A no-op if wrapper
 * has already been detached some other way. */
function restoreFlippedElement(flip) {
  flip.el.classList.remove('card-flip-face');
  if (flip.wrapper.parentNode) {
    flip.wrapper.parentNode.insertBefore(flip.el, flip.wrapper);
    flip.wrapper.remove();
  }
}

/** Flips the currently-open card (if any) back to its front face and, once
 * the closing half of the animation has actually finished, restores el to
 * exactly how/where it looked before flipCard() ever touched it. Safe to
 * call with nothing open (a no-op) — used by the global click/contextmenu
 * listeners in js/main.js and the Escape key. */
function closeCardFlip() {
  const flip = activeCardFlip;
  if (!flip) return;
  activeCardFlip = null;
  // If el was already moved out from under us by something else while the
  // flip was open (see closeCardFlipImmediate() below), there's nothing
  // left here to animate/restore.
  if (flip.el.parentNode !== flip.inner) return;
  flip.inner.classList.remove('card-flip-inner--flipped');
  const restore = () => {
    if (flip.el.parentNode !== flip.inner) return;
    restoreFlippedElement(flip);
  };
  flip.inner.addEventListener('transitionend', restore, { once: true });
  // Safety net in case transitionend never fires for some reason.
  setTimeout(restore, CARD_FLIP_MS + 60);
}

/** Drops the currently-open flip's state WITHOUT animating it closed, but
 * still restores el to its real place in the DOM immediately — for use
 * only right before something else is about to tear down/rebuild the same
 * element's content anyway (renderRoom()/renderWeaponSlot()/
 * renderShieldSlot()/renderDeckbuilder(), each already calling this at
 * their own top, same "about to repaint, clear any transient state first"
 * reasoning hideCardTooltip() there already follows). A room card gets
 * discarded and rebuilt from scratch regardless, so restoring its exact
 * position first is moot there, but #weapon-slot-card/#shield-slot-card
 * are persistent nodes reused (not recreated) across renders — without
 * putting el back under its real parent (#weapon-slot-wrap) first, the
 * next renderWeaponSlot()/renderShieldSlot() would still find and update
 * the right element by id, but leave it permanently stuck one level too
 * deep inside a now-orphaned wrapper/inner, breaking every percentage-
 * based/absolutely-positioned sibling that assumes it sits directly under
 * that wrapper (e.g. #weapon-fragile-bar). A blunt "any re-render just
 * closes the flip" rule rather than only closing when the *specific*
 * flipped element is the one being rebuilt — simpler to reason about, and
 * examining a card's description while some other action re-renders the
 * screen is a reasonable enough time to let the peek end anyway. */
function closeCardFlipImmediate() {
  const flip = activeCardFlip;
  activeCardFlip = null;
  if (!flip) return;
  restoreFlippedElement(flip);
}

/** Flips `el` (any element with data-flip-name/data-flip-desc set, see the
 * comment above the CARD_FLIP_MS constant) in place to show its
 * description. el ITSELF becomes the flip's rotating front face — see the
 * long "card flip" comment in style.css for the full reasoning (in short:
 * an earlier version left el static and only rotated its extracted
 * children, which looked like the artwork flipping inside a stationary
 * card frame; moving el itself, background/frame art and all, fixes that
 * at the root, since there's only one rotating object left to ever get out
 * of sync).
 *
 * A new `wrapper` div is inserted at el's current position in the
 * DOM/layout (sized, inline, from el's own measured rect, since it starts
 * out otherwise empty of any content that could size it) — this is what
 * keeps el's spot in a flex row (#room) or grid (a Deckbuilder pool/slots
 * grid) reserved while el itself is momentarily elsewhere. el is then
 * moved inside a new `.card-flip-inner` (appended into `wrapper`),
 * alongside a new `.card-flip-face--back` sibling holding the name/
 * description; both get `position: absolute; inset: 0` from the shared
 * `.card-flip-face` class in style.css, which — per that rule's own
 * comment — resolves to exactly el's original box either way, regardless
 * of whether el has its own explicit size (a real `.card`) or not (a
 * `.gallery-item` Deckbuilder tile). */
function flipCard(el) {
  if (activeCardFlip) return; // one at a time, see the comment above
  const desc = el.dataset.flipDesc;
  if (!desc) return;
  const name = el.dataset.flipName || '';

  const rect = el.getBoundingClientRect();

  const wrapper = document.createElement('div');
  wrapper.className = 'card-flip-active';
  wrapper.style.width = `${rect.width}px`;
  wrapper.style.height = `${rect.height}px`;
  el.parentNode.insertBefore(wrapper, el);

  const back = document.createElement('div');
  back.className = 'card-flip-face card-flip-face--back';
  const backName = document.createElement('div');
  backName.className = 'card-flip-back-name';
  backName.textContent = name;
  const backDesc = document.createElement('div');
  backDesc.className = 'card-flip-back-desc';
  backDesc.textContent = desc;
  back.appendChild(backName);
  back.appendChild(backDesc);

  const inner = document.createElement('div');
  inner.className = 'card-flip-inner';
  el.classList.add('card-flip-face');
  inner.appendChild(el);
  inner.appendChild(back);
  wrapper.appendChild(inner);

  activeCardFlip = { el, wrapper, inner };

  // Triggered on the next frame so the unflipped state actually paints
  // first — adding the class in the same synchronous pass that builds the
  // structure would let the browser skip straight to the flipped state
  // with no visible transition.
  requestAnimationFrame(() => {
    inner.classList.add('card-flip-inner--flipped');
  });
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
  const label = state.outcome === 'won' ? t('victory') : t('defeat');
  // The banner artwork itself (images/backgrounds/victory.png / defeat.png)
  // has its "VICTORY"/"Defeat" text painted directly into the image, in
  // English only, so #gameover-text is kept (translated, per the existing
  // t() pattern) purely as this image's alt text for screen readers, not
  // shown visually, see the #gameover-text CSS rule for why.
  document.getElementById('gameover-text').textContent = label;
  const image = document.getElementById('gameover-image');
  image.src =
    state.outcome === 'won'
      ? 'images/backgrounds/victory.png'
      : 'images/backgrounds/defeat.png';
  image.alt = label;
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

/** Builds one portrait+name+rank tile — used both for #gallery-grid (where
 * clicking it opens the detail popup, see openGalleryDetail() in main.js)
 * and, via buildDeckbuilderWeaponTile() further down, for the Deckbuilder's
 * slot/pool tiles (where clicking it selects/deselects instead). `kind`/
 * `key` are stashed as dataset attributes so a delegated click handler knows
 * which item was clicked without needing a closure per tile. `rankLabel`
 * overrides the default "String(key)" bottom line — pass '' to omit it
 * entirely (used for champions, which have no rank). `cost`, if given, adds
 * a small corner badge showing a weapon's Deckbuilder deckCost (js/cards.js)
 * — separate from the strength number already shown in the frame's hexagon,
 * since for a ranged weapon the two differ (see js/deckbuilder.js). */
function buildGalleryItem(kind, image, name, key, rankLabel, cost) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.dataset.kind = kind;
  item.dataset.key = key;

  // Weapons (melee, ranged, and mage), Shields, and Monsters all get the
  // real in-game card frame (see .gallery-item[data-kind='weapons']/
  // [data-kind='rangedWeapons']/[data-kind='mageWeapons']/
  // [data-kind='shields']/[data-kind='monsters'] in style.css) instead of
  // the plain flat icon tile — this needs two structural differences from
  // the plain-tile layout below, so all five are gated on the same flag.
  // Ranged and Mage weapons both reuse the exact same '.card--weapon'
  // frame/box percentages as melee (all three are type 'weapon', see
  // "Ranged Weapons"/"Mage Staffs" in CLAUDE.md), just under their own
  // 'rangedWeapons'/'mageWeapons' kind so the detail popup
  // (renderGalleryDetail() below) can tell them apart from a melee card at
  // the same rank value.
  const usesCardFrame =
    kind === 'weapons' ||
    kind === 'rangedWeapons' ||
    kind === 'mageWeapons' ||
    kind === 'shields' ||
    kind === 'monsters';

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

  const label = rankLabel !== undefined ? rankLabel : String(key);
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

  if (usesCardFrame && cost !== undefined) {
    const costEl = document.createElement('div');
    costEl.className = 'gallery-item-cost';
    costEl.textContent = String(cost);
    costEl.title = t('deckbuilderCostTitle', { n: cost });
    portrait.appendChild(costEl);
  }

  return item;
}

/** A full-width label, splitting a grid of tiles into headed categories
 * without needing separate panels — originally built for the Weapons
 * gallery's Close Range/Ranged split, now reused by the Deckbuilder's pool
 * (renderDeckbuilder() below) for the exact same split. Spans every column
 * the same way #room-empty spans the 2x2 room grid (see CLAUDE.md's "Fixed
 * card positions within the 2x2 grid"), via .gallery-section-heading's own
 * grid-column: 1 / -1 in style.css. */
function buildGallerySectionHeading(text) {
  const heading = document.createElement('div');
  heading.className = 'gallery-section-heading';
  heading.textContent = text;
  return heading;
}

/** Fills #gallery-overlay for one of 'champions' / 'monsters' / 'shields'.
 * Monsters/Shields list every rank's artwork + flavor name (same data as the
 * card tooltips, see flavorNameFor() above); Champions lists the fixed
 * CHAMPIONS roster (js/champion-icons.js) instead of a rank range. Weapons
 * used to be a fourth kind here — see renderDeckbuilder() further down for
 * where that view now lives. */
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
  // Shields and Monsters each get the same illustrated-card-frame treatment
  // as Champions, each with its own frame/positioning (see .gallery-item
  // [data-kind='shields']/[data-kind='monsters'] in style.css). Weapons used
  // to be a third kind here too ('weapons'/'rangedWeapons') — that whole
  // gallery view has been replaced by the Deckbuilder (js/deckbuilder.js,
  // renderDeckbuilder() below), which reuses buildGalleryItem() directly for
  // its own tiles instead of going through renderGallery()/this function.
  grid.classList.toggle('gallery-grid--shields', kind === 'shields');
  grid.classList.toggle('gallery-grid--monsters', kind === 'monsters');

  // Ranges are the ×5-rescaled rank values (see the "Value rescale" note in
  // js/cards.js) — old rank 2-14/3-5 is now 10-70/15-25, in steps of 5
  // instead of 1.
  if (kind === 'monsters') {
    title.textContent = t('galleryTitleMonsters');
    // Reads the same pool getFreshDeck()'s monster selection draws from
    // (getMonsterRankPool() in js/monster-icons.js), not a hardcoded range —
    // a newly added monster rank shows up here automatically, with no range
    // to remember to extend (see "Monster Pool" in js/cards.js).
    getMonsterRankPool().forEach((rank) => {
      grid.appendChild(
        buildGalleryItem('monsters', `images/monsters/${rank}.png`, monsterNameFor(rank), rank)
      );
    });
  } else if (kind === 'shields') {
    title.textContent = t('galleryTitleShields');
    for (let rank = 15; rank <= 25; rank += 5) {
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
 * or, for a champion, a short flavor blurb followed by its passive-ability
 * text and its active-ability name + text. `key` is a rank number for
 * weapons/monsters/shields, or a champion id string for champions. */
function renderGalleryDetail(kind, key) {
  let image, name, description, subtitle;
  let isHtml = false;

  // 'weapons'/'rangedWeapons' used to be handled here too, back when the
  // Weapons gallery opened this same detail popup on a tile click — see
  // renderDeckbuilder()/buildDeckbuilderWeaponTile() for where a weapon
  // tile's flavor text (weaponDescriptionFor()/rangedWeaponDescriptionFor())
  // is shown now instead (a native title tooltip, since the Deckbuilder's
  // own click behavior is select/deselect, not "open a detail popup").
  if (kind === 'monsters') {
    image = `images/monsters/${key}.png`;
    name = monsterNameFor(key);
    description = monsterDescriptionFor(key);
    subtitle = t('strengthLabel', { n: rankLabel(key) });
  } else if (kind === 'shields') {
    image = `images/shields/${key}.png`;
    name = shieldNameFor(key);
    description = shieldDescriptionFor(key);
    // Shields block damage rather than dealing/healing it, so their number
    // is labeled "Block" here instead of "Strength" (unlike weapons/
    // monsters) — see js/shield-icons.js.
    subtitle = t('blockLabel', { n: rankLabel(key) });
  } else {
    const champ = championById(key);
    image = champ ? champ.image : null;
    name = champ ? champ.name : '';
    // No "Strength N"/"Block N" line for a champion — the passive/active
    // ability sections below now carry the "Passive Ability"/"Active
    // Ability" labels inline instead, so this line is left empty.
    subtitle = '';
    isHtml = true;
    const abilityDetails = champ ? abilityDetailsFor(champ.id) : null;
    description = champ
      ? `<p>${champ.flavor}</p>` +
        `<p><span class="gallery-detail-label">${t('passiveAbilityLabel')}</span>${champ.description}</p>` +
        (abilityDetails
          ? `<p><span class="gallery-detail-label">${t('activeAbilityLabel')}</span><strong>${abilityDetails.name}:</strong> ${abilityDetails.description}</p>`
          : '')
      : '';
  }

  const portrait = document.getElementById('gallery-detail-image');
  fillPortrait(portrait, image, name, (name || '?').charAt(0));

  document.getElementById('gallery-detail-title').textContent = name || '';
  const rankEl = document.getElementById('gallery-detail-rank');
  rankEl.textContent = subtitle;
  // Hidden entirely (not just empty) so it doesn't reserve a blank line's
  // worth of height above the champion text block below it.
  rankEl.style.display = subtitle ? '' : 'none';
  const textEl = document.getElementById('gallery-detail-text');
  if (isHtml) {
    textEl.innerHTML = description || '';
  } else {
    textEl.textContent = description || '';
  }
}

// --- Deckbuilder (weapon loadout, replaces the old Weapons gallery — see
// js/deckbuilder.js for the selection state/rules and openDeckbuilder()/the
// click wiring in js/main.js) -------------------------------------------

/** One weapon tile for the Deckbuilder — reuses buildGalleryItem() wholesale
 * (the exact same illustrated card-frame treatment the old Weapons gallery
 * tiles had, see "Weapons gallery reuses the real in-game weapon card
 * frame" in CLAUDE.md) so a tile looks identical whether it's sitting in a
 * loadout slot or the pool below, just with its deckCost badge added (see
 * buildGalleryItem()'s `cost` param) and `dataset.cardId` set to the card's
 * real js/cards.js id, so the click handlers in js/main.js can select/
 * deselect it directly rather than reconstructing an id from kind+rank. */
function buildDeckbuilderWeaponTile(card) {
  const isRanged = card.suit === SUITS.RANGED;
  const isMage = card.suit === SUITS.MAGE;
  const kind = isRanged ? 'rangedWeapons' : isMage ? 'mageWeapons' : 'weapons';
  const name = isRanged
    ? rangedWeaponNameFor(card.rank)
    : isMage
      ? mageWeaponNameFor(card.rank)
      : weaponNameFor(card.rank);
  const item = buildGalleryItem(kind, card.image, name, card.rank, undefined, card.deckCost);
  item.dataset.cardId = card.id;
  // Right-click / long-press flip target (see flipCard() in this file) —
  // carries the flavor text the old Weapons gallery's detail popup used to
  // show (see the removed 'weapons'/'rangedWeapons' branches in
  // renderGalleryDetail() above). The Deckbuilder's own click behavior is
  // select/deselect, not "open a detail popup", so a native title tooltip
  // isn't the right fit here either — flip is.
  item.dataset.flipName = name;
  item.dataset.flipDesc = isRanged
    ? `${rangedWeaponDescriptionFor(card.rank)} ${t('rangedAmmoSentence', { n: RANGED_AMMO_MAX })}`
    : isMage
      ? `${mageWeaponDescriptionFor(card.rank)} ${t('mageManaSentence', { n: MAGE_MANA_COST })}`
      : weaponDescriptionFor(card.rank);
  return item;
}

/** Fills #deckbuilder-slots (always exactly DECKBUILDER_MAX_SLOTS boxes,
 * js/deckbuilder.js — empty ones as a plain dashed placeholder) and
 * #deckbuilder-pool (every weapon NOT currently selected, split into the
 * same Close Range/Ranged sections the old Weapons gallery used, via
 * buildGallerySectionHeading()), plus the slot-count/budget stat lines.
 * Called after every change to deckbuilderState (select, deselect) and once
 * on openDeckbuilder() — always a full re-render rather than patching
 * individual tiles in and out, simple and cheap enough at this scale (at
 * most 13 weapon cards total). */
function renderDeckbuilder() {
  // Same reasoning as renderRoom()'s closeCardFlipImmediate() call — every
  // tile is about to be torn down and rebuilt from scratch below.
  closeCardFlipImmediate();
  const selectedIds = getSelectedWeaponIds();
  const selectedSet = new Set(selectedIds);
  const sum = selectedWeaponValueSum();

  const slotCountEl = document.getElementById('deckbuilder-slot-count');
  const budgetEl = document.getElementById('deckbuilder-budget');
  slotCountEl.textContent = t('deckbuilderSlotsLabel', {
    n: selectedIds.length,
    max: DECKBUILDER_MAX_SLOTS,
  });
  budgetEl.textContent = t('deckbuilderBudgetLabel', { n: sum, max: DECKBUILDER_BUDGET });
  // Highlights whichever stat is currently at its cap — a quiet hint for why
  // the next click might wiggle instead of adding a weapon, on top of the
  // wiggle itself (see triggerDeckbuilderWiggle() below).
  slotCountEl.classList.toggle(
    'deckbuilder-stat--full',
    selectedIds.length >= DECKBUILDER_MAX_SLOTS
  );
  budgetEl.classList.toggle('deckbuilder-stat--full', sum >= DECKBUILDER_BUDGET);

  const slotsGrid = document.getElementById('deckbuilder-slots');
  slotsGrid.innerHTML = '';
  for (let i = 0; i < DECKBUILDER_MAX_SLOTS; i++) {
    const id = selectedIds[i];
    const card = id ? getCardById(id) : null;
    if (card) {
      slotsGrid.appendChild(buildDeckbuilderWeaponTile(card));
    } else {
      const empty = document.createElement('div');
      empty.className = 'deckbuilder-slot-empty';
      slotsGrid.appendChild(empty);
    }
  }

  const pool = document.getElementById('deckbuilder-pool');
  pool.innerHTML = '';
  const meleeCards = getAllWeaponCards().filter(
    (card) => card.suit === SUITS.DIAMONDS && !selectedSet.has(card.id)
  );
  const rangedCards = getAllWeaponCards().filter(
    (card) => card.suit === SUITS.RANGED && !selectedSet.has(card.id)
  );
  // Mage Staffs (custom addition, see "Mage Staffs" in CLAUDE.md) get a
  // third pool section, right after Ranged — same split mechanism
  // (buildGallerySectionHeading()) as Close Range/Ranged above, just one
  // more category.
  const mageCards = getAllWeaponCards().filter(
    (card) => card.suit === SUITS.MAGE && !selectedSet.has(card.id)
  );
  if (meleeCards.length > 0) {
    pool.appendChild(buildGallerySectionHeading(t('galleryHeadingMeleeWeapons')));
    meleeCards.forEach((card) => pool.appendChild(buildDeckbuilderWeaponTile(card)));
  }
  if (rangedCards.length > 0) {
    pool.appendChild(buildGallerySectionHeading(t('galleryHeadingRangedWeapons')));
    rangedCards.forEach((card) => pool.appendChild(buildDeckbuilderWeaponTile(card)));
  }
  if (mageCards.length > 0) {
    pool.appendChild(buildGallerySectionHeading(t('galleryHeadingMageWeapons')));
    mageCards.forEach((card) => pool.appendChild(buildDeckbuilderWeaponTile(card)));
  }
}

/** Briefly wiggles `el` (reuses the exact same card-shake keyframe as
 * .card--shake elsewhere in the game, see CLAUDE.md) — used both on a pool
 * tile that couldn't be added (loadout full, or adding it would go over
 * budget, see canSelectDeckbuilderWeapon() in js/deckbuilder.js) and, for
 * whichever limit actually blocked it, on that stat line too, so it's clear
 * which one was hit. Removes-then-re-adds the class with a forced reflow in
 * between (same gotcha as animateShieldShake() elsewhere in this file) so
 * back-to-back clicks each restart the animation instead of silently
 * no-op-ing on an already-present class. */
function triggerDeckbuilderWiggle(el) {
  el.classList.remove('deckbuilder-item--wiggle');
  void el.offsetWidth;
  el.classList.add('deckbuilder-item--wiggle');
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
  renderWeaponToggle();
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
 * ran out of uses or a Ranged weapon that just ran out of ammo (see
 * js/weapon-effects.js and breakEquippedWeapon() in js/state.js). See
 * animateSlotShatter() above. Callers must wait until any
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

// --- ranged weapon-attack animation -----------------------------------------

// A bow shot gets its own swing shape rather than reusing animateWeaponAttack
// above (see "Ranged Weapons" in CLAUDE.md): draw back a little in the
// OPPOSITE direction from the shot first (like pulling a bowstring taut),
// then loose the shot at the monster — that "out" leg alone runs at twice
// the speed (half the duration) of a melee swing's own out leg, by request.
// The impact pause and the return-to-slot leg keep melee's exact timing (a
// bow "returns to the slot at the same normal speed" a sword does), so only
// WEAPON_ATTACK_OUT_MS is halved here, nothing else.
const RANGED_ATTACK_DRAW_MS = 240;
// A brief, still hold at full draw before loosing the shot — by request
// ("zurückziehen, ganz kurz stehen bleiben, und dann sehr rasch
// beschleunigt losschießen"), reads as the archer holding aim for an
// instant rather than the draw flowing straight into the shot.
const RANGED_ATTACK_HOLD_MS = 110;
const RANGED_ATTACK_OUT_MS = WEAPON_ATTACK_OUT_MS / 2;
// How far the draw-back leg pulls, as a fraction of the full slot-to-target
// distance, in the reverse direction — "a bit", not a full mirror of the shot.
const RANGED_ATTACK_DRAW_FRACTION = 0.22;

/** Same idea as animateWeaponAttack() above (animates the real
 * #weapon-slot-card element itself, not a clone, so the slot is simply
 * empty-looking for the instant its card is "out"), but with a bow-specific
 * five-leg swing: draw back, hold, loose the shot, pause on impact, return.
 * See the comments below for which legs share melee's timing and which
 * don't. Same `onImpact`/`onDone` contract and `{ speedUp }` controller
 * shape as animateWeaponAttack(), cascading through every remaining leg
 * once called. */
function animateRangedAttack(monsterEl, onImpact, onDone = () => {}) {
  const slot = document.getElementById('weapon-slot-card');
  const slotRect = slot.getBoundingClientRect();
  const targetRect = monsterEl.getBoundingClientRect();

  const dx = targetRect.left + targetRect.width / 2 - (slotRect.left + slotRect.width / 2);
  const dy = targetRect.top + targetRect.height / 2 - (slotRect.top + slotRect.height / 2);

  slot.style.position = 'relative';
  slot.style.zIndex = '60';

  let current = null;
  let speedRequested = false;

  // Leg 1: draw back, a little, in the opposite direction from the shot.
  current = animateTransform(
    slot,
    {
      transform: `translate(${-dx * RANGED_ATTACK_DRAW_FRACTION}px, ${-dy * RANGED_ATTACK_DRAW_FRACTION}px) rotate(8deg) scale(0.96)`,
    },
    RANGED_ATTACK_DRAW_MS,
    'cubic-bezier(0.4, 0, 0.6, 1)',
    () => {
      // Leg 2: hold at full draw for a beat before loosing the shot.
      current = speedableTimeout(() => {
        // Leg 3: loose the shot — twice as fast as a melee swing's out leg
        // (RANGED_ATTACK_OUT_MS), and with a much steeper ease-in than
        // melee's own swing (which gathers speed gradually): this one sits
        // almost still for the first stretch of the leg, then rockets to
        // the target right at the end, reading as a sudden release rather
        // than a smooth lunge.
        current = animateTransform(
          slot,
          { transform: `translate(${dx}px, ${dy}px) rotate(-16deg) scale(1.08)` },
          RANGED_ATTACK_OUT_MS,
          'cubic-bezier(0.85, 0, 1, 0.6)',
          () => {
            onImpact();

            current = speedableTimeout(() => {
              // Leg 4: return to the weapon slot, same speed as a melee swing.
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
        if (speedRequested) current.speedUp();
      }, RANGED_ATTACK_HOLD_MS);
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

// --- mage-staff attack animation ---------------------------------------------
// Custom addition, see "Mage Staffs" in CLAUDE.md. Deliberately NOT a swing
// like melee/ranged above — a Mage Staff casts from where it stands, so the
// weapon slot itself never moves (per request, "Option 2: Static Cast" — the
// simplest of three animation directions considered, precisely because it
// needs no flight/travel-distance math at all). Instead: a brief "channeling"
// glow pulses on the weapon slot, then the spell lands on the target — a
// rune-glow ring flashes over the monster's own card, a small scatter of
// spark particles bursts outward from it (the damage-colored counterpart to
// showAbilityHealBurst()'s heal-colored "+" marks), and the card gets a quick
// shake, all via animateMageCastImpact() below.

// Keep in sync with the animation-duration on .weapon-slot-casting in
// style.css. A single short glow pulse reads as "gathering power" without
// needing the weapon to actually leave the slot.
const MAGE_ATTACK_CHARGE_MS = 350;
// A brief settle beat after the spell lands, before the action is considered
// fully done (mirrors the small pause every other attack animation has
// between its own impact and onDone(), e.g. WEAPON_ATTACK_IMPACT_MS above).
const MAGE_ATTACK_SETTLE_MS = 150;

// Keep both in sync with the animation-durations on .mage-cast-glow /
// .mage-cast-particle in style.css.
const MAGE_CAST_GLOW_MS = 500;
const MAGE_CAST_PARTICLE_MS = 650;

/** Plays the "spell strikes home" impact feedback for a Mage Staff attack —
 * called once, right as the cast lands, by animateMageAttack() below. A
 * rune-glow ring and a burst of spark particles are positioned via
 * getBoundingClientRect() and appended to <body> as `position: fixed` (same
 * reasoning as showCardDamage() above) rather than as children of
 * `monsterEl` or reliant on it staying in the DOM — a mage shot that
 * survives has resolveAndAnimate() (js/main.js) call renderRoom() almost
 * immediately after impact, replacing every room card's element well before
 * these effects finish playing; a fixed-position overlay snapshotted at the
 * card's CURRENT position keeps playing regardless. The shake, by contrast,
 * is applied directly to `monsterEl` — safe for the same short window
 * main.js's own generic shotDamage-shake already relies on for Ranged
 * weapons (see applyResolve() in js/main.js), and harmless to double up with
 * it on a surviving hit. */
function animateMageCastImpact(monsterEl) {
  const rect = monsterEl.getBoundingClientRect();

  const ring = document.createElement('div');
  ring.className = 'mage-cast-glow';
  ring.style.left = `${rect.left}px`;
  ring.style.top = `${rect.top}px`;
  ring.style.width = `${rect.width}px`;
  ring.style.height = `${rect.height}px`;
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), MAGE_CAST_GLOW_MS);

  // Scattered in a ring around the card's own center, at a random angle/
  // distance (as a fraction of the card's own size, so it scales with
  // --card-scale automatically) — same "never look identical twice" idea as
  // showAbilityHealBurst()'s particle scatter.
  const count = 6 + Math.floor(Math.random() * 3); // 6-8 sparks
  for (let i = 0; i < count; i++) {
    const mark = document.createElement('span');
    mark.className = 'mage-cast-particle';
    mark.textContent = '-';
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.3 + Math.random() * 0.35;
    mark.style.left = `${rect.left + rect.width / 2 + Math.cos(angle) * rect.width * distance}px`;
    mark.style.top = `${rect.top + rect.height / 2 + Math.sin(angle) * rect.height * distance}px`;
    mark.style.animationDelay = `${Math.random() * 100}ms`;
    document.body.appendChild(mark);
    setTimeout(() => mark.remove(), MAGE_CAST_PARTICLE_MS + 150);
  }

  // Same remove-then-re-add-with-a-forced-reflow gotcha as
  // animateShieldShake() elsewhere in this file, so back-to-back mage hits on
  // the same still-surviving card each restart the shake instead of silently
  // no-op-ing on an already-present class.
  monsterEl.classList.remove('card--shake');
  void monsterEl.offsetWidth;
  monsterEl.classList.add('card--shake');
}

/** Same onImpact/onDone contract and `{ speedUp }` controller shape as
 * animateWeaponAttack()/animateRangedAttack() above, so resolveAndAnimate()
 * (js/main.js) doesn't need to know which one is playing — but structurally
 * much simpler, since nothing here actually moves: a charge pause, the
 * impact (animateMageCastImpact() above, right where onImpact() fires so its
 * getBoundingClientRect() snapshot is always still accurate), then a short
 * settle pause before onDone(). */
function animateMageAttack(monsterEl, onImpact, onDone = () => {}) {
  const slot = document.getElementById('weapon-slot-card');

  let current = null;
  let speedRequested = false;

  // Leg 1: a brief glow pulse on the slot itself while the spell "charges".
  // Same remove-then-re-add-with-a-forced-reflow gotcha as
  // animateMageCastImpact()'s own shake above, so back-to-back casts each
  // restart the pulse.
  slot.classList.remove('weapon-slot-casting');
  void slot.offsetWidth;
  slot.classList.add('weapon-slot-casting');

  current = speedableTimeout(() => {
    // Leg 2: the spell lands.
    animateMageCastImpact(monsterEl);
    onImpact();

    // Leg 3: a short settle beat before the action counts as fully done.
    current = speedableTimeout(() => {
      current = null;
      onDone();
    }, MAGE_ATTACK_SETTLE_MS);
    if (speedRequested) current.speedUp();
  }, MAGE_ATTACK_CHARGE_MS);
  if (speedRequested) current.speedUp();

  return {
    speedUp() {
      speedRequested = true;
      if (current) current.speedUp();
    },
  };
}
