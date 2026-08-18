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
 * normal tier border — the very strongest monsters (J/Q/K/A, rank 11+) and
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
  const canFlee = !state.gameOver && state.room.length === 4 && !state.fledLastRoom;
  btn.disabled = !canFlee;
  btn.title = state.fledLastRoom
    ? "Can't flee two rooms in a row"
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

function renderAll() {
  renderHp();
  renderRoom();
  renderDeckCount();
  renderWeaponSlot();
  renderFleeButton();
  renderMessage('');
  renderGameOverBanner();
}

// --- weapon-equip animation -------------------------------------------------

// Keep in sync with the transition duration set on .weapon-flying in style.css.
const WEAPON_FLY_MS = 380;

/** Animates a clone of `cardEl` flying from its current position into the
 * weapon slot, then calls onDone(). The original card is hidden immediately
 * so nothing appears duplicated during the flight. */
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

  requestAnimationFrame(() => {
    const dx = endRect.left + (endRect.width - startRect.width) / 2 - startRect.left;
    const dy = endRect.top + (endRect.height - startRect.height) / 2 - startRect.top;
    const scale = endRect.width / startRect.width;
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    clone.style.opacity = '0.4';
  });

  setTimeout(() => {
    clone.remove();
    onDone();
  }, WEAPON_FLY_MS);
}
