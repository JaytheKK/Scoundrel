// ---------------------------------------------------------------------------
// Scoundrel — monster pool selection (custom addition, not part of the
// original Scoundrel rules).
//
// See "Monster Pool" in js/cards.js for how the pool itself (2 card
// instances per monster rank) is built. This file only holds the constants
// and the random-selection algorithm that picks this game's 26 monster
// cards out of that pool, called once per new game from getFreshDeck() in
// js/cards.js. Kept as its own file rather than folded into cards.js (which
// stays "data only") or state.js, mirroring how js/weapon-effects.js holds
// its own once-per-game random roll (rollWeaponEffects()) separately too.
// ---------------------------------------------------------------------------

// How many monster cards end up in a fresh deck — fixed regardless of how
// many monster ranks/types actually exist in the pool. Deliberately NOT the
// same thing as "how many monster ranks exist" (see getMonsterRankPool() in
// js/monster-icons.js, which can be any number ≥ 13 and keeps growing as
// more monsters are added) — this is the number of *cards*, not types.
const MONSTER_DECK_COUNT = 26;

// A monster rank can appear at most this many times in one deck (there are
// only ever this many card instances of a given rank in the pool to begin
// with — see getAllMonsterCards() in js/cards.js — so this is really just
// documenting *why* "max 2 per type" always holds, not a separate check the
// selection below needs to enforce itself).
const MONSTER_COPIES_PER_TYPE = 2;

// The 26 selected monster cards' values must sum to within this range
// (inclusive) — keeps a game from randomly rolling a dungeon that's either
// suspiciously easy (mostly weak monsters) or unfairly hard (mostly strong
// ones) once there's enough monster ranks in the pool to actually vary this.
// Hand-tune these two numbers directly here to rebalance, nothing else needs
// to change.
//
// GOTCHA, found by actually simulating this (not just reasoning about it) at
// the 23-monster rebalance: this range must stay centered on the pool's own
// natural average sum, or it silently biases *which* monsters show up, not
// just how hard the dungeon feels. A first version of this range (1000-1100,
// left over from an earlier, smaller monster pool) sat well above the new
// 23-type pool's natural average unconstrained-draw sum (~984, empirically —
// 20000 simulated unconstrained draws averaged 984.5, every one of the 23
// monster values included in ~56-57% of draws regardless of its strength,
// exactly uniform as expected). Forcing every draw up into 1000-1100 meant
// the rejection-sampling loop below could only ever accept draws that
// over-represent strong monsters to reach that inflated sum — simulated at
// 20000 draws, the weakest monster (value 10) ended up in only ~47% of
// games while the strongest (value 70) ended up in ~67%, a real, measurable
// bias toward hard dungeons, not the small/negligible one you'd expect from
// "just" narrowing the range. Re-centering the range on the pool's actual
// natural average (940-1030, straddling ~984) brought every monster back to
// ~56-57% regardless of strength, matching the unconstrained baseline almost
// exactly, confirmed by re-running the same simulation. **Any future change
// to the monster pool's contents (adding/removing/re-valuing monster types)
// changes this natural average too, and must be re-simulated the same way
// before touching these two numbers** — eyeballing "does this range look
// reasonable" is not enough, the bias above looked perfectly reasonable on
// paper (1000-1100 isn't an absurd range for a pool averaging ~40 per card
// across 26 cards) and still produced a real, meaningfully unfair skew.
const MONSTER_VALUE_SUM_MIN = 940;
const MONSTER_VALUE_SUM_MAX = 1030;

// Rejection-sampling cap for the loop below (same pattern as drawForRoom()'s
// 100-attempt cap in js/state.js). Empirically, at the current 23-rank pool
// and a properly-centered MONSTER_VALUE_SUM_MIN/MAX (see the gotcha above),
// simulating 20000 game starts needed only ~2-3 attempts on average and
// never once hit this cap — 300 is a generous safety net, not a value tuned
// to "barely" work. Purely a computational safety net regardless: each
// attempt is a full array shuffle plus a sum over a few dozen cards at most,
// so even 300 attempts finishes in well under a millisecond on any device
// (this runs once, synchronously, on "New Game" — nowhere near the real,
// network-bound loading-time problem documented in CLAUDE.md's "Loading
// screen" section, which this has nothing to do with).
const MONSTER_SELECTION_MAX_ATTEMPTS = 300;

/** Picks this game's 26 monster cards out of `pool` (every monster card
 * instance that currently exists — see getAllMonsterCards() in js/cards.js).
 *
 * If the pool doesn't have more cards than MONSTER_DECK_COUNT needs (true up
 * through 13 monster ranks × 2 = 26 — the pool now has 23 ranks × 2 = 46, so
 * this branch is dormant for real gameplay today, but stays here for a small
 * pool, e.g. a test harness, or if the roster is ever trimmed back down),
 * there's no real choice to make — every card is used, and the value-sum
 * check below is skipped entirely since there's no freedom to satisfy it.
 * This exactly matches the game's behavior before this feature existed, and
 * is a real, expected, tested case, not just an edge case that happens to
 * work.
 *
 * Once the pool has more cards than that, this reshuffles the whole pool and
 * takes the first MONSTER_DECK_COUNT cards, retrying (rejection sampling —
 * same style as isRoomSafe()/drawForRoom() in js/state.js) until their total
 * value falls within [MONSTER_VALUE_SUM_MIN, MONSTER_VALUE_SUM_MAX], or until
 * MONSTER_SELECTION_MAX_ATTEMPTS is reached. "Max 2 copies of any one rank"
 * falls out for free here — the pool itself never holds more than 2
 * instances of a given rank, so a random subset of it can't either.
 *
 * If no attempt lands in range (only realistically possible with a
 * pathologically narrow range or a pool whose natural average sits well
 * outside it), falls back to the closest-to-range candidate seen across all
 * attempts instead of failing outright, and logs a warning so a badly-tuned
 * range gets noticed during testing rather than silently shipping a
 * slightly-off dungeon. Depends on shuffle() (js/state.js). */
function selectMonsterCardsForDeck(pool) {
  if (pool.length <= MONSTER_DECK_COUNT) {
    return pool.slice();
  }

  let best = null;
  let bestDiff = Infinity;

  for (let attempt = 0; attempt < MONSTER_SELECTION_MAX_ATTEMPTS; attempt++) {
    const candidate = shuffle(pool).slice(0, MONSTER_DECK_COUNT);
    const sum = candidate.reduce((total, card) => total + card.rank, 0);

    if (sum >= MONSTER_VALUE_SUM_MIN && sum <= MONSTER_VALUE_SUM_MAX) {
      return candidate;
    }

    const diff = sum < MONSTER_VALUE_SUM_MIN ? MONSTER_VALUE_SUM_MIN - sum : sum - MONSTER_VALUE_SUM_MAX;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }

  console.warn(
    `selectMonsterCardsForDeck(): no combination found within [${MONSTER_VALUE_SUM_MIN}, ${MONSTER_VALUE_SUM_MAX}] ` +
      `after ${MONSTER_SELECTION_MAX_ATTEMPTS} attempts (closest sum was off by ${bestDiff}); using the closest one found.`
  );
  return best;
}
