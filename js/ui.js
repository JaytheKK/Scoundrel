// ---------------------------------------------------------------------------
// Scoundrel — rendering only. Reads `state` from state.js and draws it to the
// DOM. Contains no game rules — clicks are wired up in main.js, which calls
// into state.js and then asks this file to re-render.
// ---------------------------------------------------------------------------

/** Fills a card-shaped element with a card's face: its artwork (or the suit
 * symbol as a fallback, for any card without artwork) front and center, the
 * card's numeric value at the bottom — always a plain number, never a suit
 * letter (no J/Q/K/A) — and, for a weapon with a rolled effect, a small
 * corner badge. Shared by renderCard() and the weapon slot, which displays
 * the equipped weapon the same way. */
function fillCardFace(el, card) {
  el.innerHTML = '';

  if (card.image) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = card.image;
    img.alt = card.name;
    el.appendChild(img);
  } else {
    const symbol = document.createElement('div');
    symbol.className = 'card-suit-symbol';
    symbol.textContent = SUIT_SYMBOLS[card.suit];
    el.appendChild(symbol);
  }

  if (card.effect && WEAPON_EFFECTS[card.effect]) {
    const effect = WEAPON_EFFECTS[card.effect];
    const badge = document.createElement('div');
    badge.className = 'card-effect-badge';
    badge.textContent = effect.icon;
    badge.title = `${effect.name} — ${effect.description}`;
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

/** The flavor name to show alongside a card's plain name in its tooltip
 * (e.g. "8 of Hearts — Imperial Potion"). Keyed off `baseRank`, not the
 * (possibly effect-lowered) current `rank`, so a monster weakened by the
 * Electric weapon effect still shows as the same creature. */
function flavorNameFor(card) {
  if (card.type === 'monster') return monsterNameFor(card.baseRank);
  if (card.type === 'potion') return potionNameFor(card.baseRank);
  if (card.type === 'weapon') return weaponNameFor(card.baseRank);
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
  const flavorName = flavorNameFor(card);
  const title = flavorName ? `${card.name} — ${flavorName}` : card.name;
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
    tagline.textContent = 'The dungeon awaits...';

    const cta = document.createElement('button');
    cta.id = 'room-start-btn';
    cta.textContent = 'New Game';

    empty.appendChild(tagline);
    empty.appendChild(cta);
    roomEl.appendChild(empty);
    return;
  }

  state.room.forEach((card) => roomEl.appendChild(renderCard(card)));
}

function renderDeckCount() {
  document.getElementById('deck-count').textContent = `Deck: ${state.deck.length} cards left`;
}

/** Fills the small circular portrait next to the HP bar with the currently
 * selected champion's artwork (or the plain-letter placeholder — see
 * fillPortrait() — for a champion that has no image yet). Called from
 * renderAll(), so it stays in sync with whatever startNewGame() picked. */
function renderChampionBadge() {
  const badge = document.getElementById('champion-badge');
  const champ = championById(state.champion);
  fillPortrait(badge, champ && champ.image, champ && champ.name, champ ? champ.name.charAt(0) : '?');
  badge.title = champ ? `${champ.name} — ${champ.description}` : '';
}

function renderHp() {
  const pct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
  const fill = document.getElementById('hp-fill');
  fill.style.width = `${pct}%`;
  document.getElementById('hp-text').textContent = `${state.hp} / ${state.maxHp} HP`;
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
    status.textContent = 'Fighting bare-handed';
  } else if (!state.equippedWeapon) {
    status.textContent = 'No weapon equipped';
  } else {
    const restriction =
      state.weaponMaxMonster === null
        ? 'Can defeat any monster'
        : `Can only defeat monsters weaker than ${state.weaponMaxMonster}`;
    const effect = state.equippedWeapon.effect && WEAPON_EFFECTS[state.equippedWeapon.effect];
    status.textContent = effect ? `${restriction} — ${effect.name}: ${effect.description}` : restriction;
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
        ? "Can't flee three rooms in a row"
        : "Can't flee two rooms in a row"
      : state.room.length !== 4
        ? 'Can only flee a full, untouched room'
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
    state.outcome === 'won' ? 'Victory' : 'Defeat';
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

  const portrait = document.createElement('div');
  portrait.className = 'gallery-item-portrait';
  fillPortrait(portrait, image, name, (name || '?').charAt(0));
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
    item.appendChild(rankEl);
  }

  return item;
}

/** Fills #gallery-overlay for one of 'champions' / 'weapons' / 'monsters'.
 * Weapons/Monsters list every rank's artwork + flavor name (same data as
 * the card tooltips, see flavorNameFor() above); Champions lists the fixed
 * CHAMPIONS roster (js/champion-icons.js) instead of a rank range. */
function renderGallery(kind) {
  const title = document.getElementById('gallery-title');
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';
  grid.classList.remove('hidden');

  if (kind === 'weapons') {
    title.textContent = 'Weapons';
    for (let rank = 2; rank <= 10; rank++) {
      grid.appendChild(
        buildGalleryItem('weapons', `images/weapons/${rank}.png`, weaponNameFor(rank), rank)
      );
    }
  } else if (kind === 'monsters') {
    title.textContent = 'Monsters';
    for (let rank = 2; rank <= 14; rank++) {
      grid.appendChild(
        buildGalleryItem('monsters', `images/monsters/${rank}.png`, monsterNameFor(rank), rank)
      );
    }
  } else {
    title.textContent = 'Champions';
    CHAMPIONS.forEach((champ) => {
      grid.appendChild(buildGalleryItem('champions', champ.image, champ.name, champ.id, ''));
    });
  }
}

/** Fills #gallery-detail-overlay for one weapon/monster/champion tile
 * clicked in the gallery (see openGalleryDetail() in main.js) — portrait,
 * name, and either "Strength N" + a flavor blurb (weapons/monsters) or the
 * champion's passive-ability text. `key` is a rank number for weapons/
 * monsters, or a champion id string for champions. */
function renderGalleryDetail(kind, key) {
  let image, name, description, subtitle;

  if (kind === 'weapons') {
    image = `images/weapons/${key}.png`;
    name = weaponNameFor(key);
    description = weaponDescriptionFor(key);
    subtitle = `Strength ${RANK_LABELS[key]}`;
  } else if (kind === 'monsters') {
    image = `images/monsters/${key}.png`;
    name = monsterNameFor(key);
    description = monsterDescriptionFor(key);
    subtitle = `Strength ${RANK_LABELS[key]}`;
  } else {
    const champ = championById(key);
    image = champ ? champ.image : null;
    name = champ ? champ.name : '';
    description = champ ? champ.description : '';
    subtitle = 'Passive Ability';
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

function renderAll() {
  renderChampionBadge();
  renderHp();
  renderRoom();
  renderDeckCount();
  renderWeaponSlot();
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

// --- weapon-attack animation -------------------------------------------------

// Total ~2s, split into three legs so it reads as one fluid swing rather than
// a linear slide: swing out to the monster (ease-in, gathering speed), a
// brief pause right on impact, then swing back into the weapon slot
// (ease-out, settling in). Driven by transform transitions rather than a
// fixed @keyframes animation because the start (weapon slot) and end (the
// clicked monster card) positions are measured at runtime and differ every
// time.
const WEAPON_ATTACK_OUT_MS = 800;
const WEAPON_ATTACK_IMPACT_MS = 150;
const WEAPON_ATTACK_RETURN_MS = 1050;

/** Animates the actual equipped-weapon card (not a clone) flying out of the
 * weapon slot to strike `monsterEl`, then flying back into the slot — about
 * 2 seconds total. Moving the real element (rather than a cloned stand-in
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
