// ---------------------------------------------------------------------------
// Scoundrel — internationalization (i18n), custom addition (not part of the
// original Scoundrel rules). The game defaults to German ('de') on a first
// visit; the player can switch to English at any time from the Options
// screen (see openOptions() in js/main.js). The choice is remembered in
// localStorage so it survives a reload.
//
// This file only holds the language mechanism itself (getLang()/setLang())
// plus t(), the lookup+substitution helper used for every UI string that
// isn't tied to a specific card/champion/effect's own data (those live in
// their own files — js/monster-icons.js, js/weapon-icons.js,
// js/shield-icons.js, js/potion-icons.js, js/champion-icons.js,
// js/ability-icons.js, js/weapon-effects.js — each holding a per-language
// table the same shape as I18N below, so a new language only ever means
// adding one more table per file, never restructuring anything). Applying
// the translations to the static DOM (buttons, headings, aria-labels, the
// #rules text) is applyStaticI18n() in js/ui.js — this file stays pure data
// + the t() helper, no DOM code, the same "no DOM code here" rule
// js/state.js follows.
//
// Loaded first (see index.html) so getLang()/setLang()/t() are available to
// every other script — several of them (js/weapon-effects.js's
// WEAPON_EFFECTS, js/champion-icons.js's CHAMPIONS) read the current
// language lazily, from a getter, every time a property is accessed, so
// switching language live-updates anything already holding a reference to
// one of those objects without needing a page reload.
// ---------------------------------------------------------------------------

const I18N_STORAGE_KEY = 'scoundrel-lang';
const DEFAULT_LANG = 'de';

/** Returns the player's current language ('de' or 'en'), from localStorage
 * if a choice was ever made, otherwise DEFAULT_LANG. Wrapped in try/catch
 * since localStorage can throw in some contexts (private browsing, a
 * restrictive embed) — this must never itself break the game over a
 * preference that's allowed to just not persist. */
function getLang() {
  try {
    const stored = localStorage.getItem(I18N_STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch (e) {
    // localStorage unavailable — fall through to the default.
  }
  return DEFAULT_LANG;
}

/** Persists the player's language choice. See getLang() above for why this
 * is wrapped in try/catch too. */
function setLang(lang) {
  if (lang !== 'de' && lang !== 'en') return;
  try {
    localStorage.setItem(I18N_STORAGE_KEY, lang);
  } catch (e) {
    // localStorage unavailable — the choice just won't survive a reload.
  }
}

// Every plain UI string that isn't part of a card/champion/effect's own
// data table (see the file comment above). Keys are grouped roughly the way
// they're used (buttons/labels, then the dynamic fight/ability/flee
// messages built in js/state.js), not alphabetically, so a related group of
// strings stays easy to review together.
const I18N = {
  en: {
    // --- loading screen ---
    loadingText: 'Loading... {pct}%',

    // --- start screen ---
    startTagline: 'A dungeon-crawling card game',
    newGame: 'New Game',
    champions: 'Champions',
    // The start screen's nav button that opens the Deckbuilder (see
    // "Weapon Deckbuilder" in CLAUDE.md) — named "Weapon Deck" rather than
    // just "Weapons" or "Deckbuilder", specifically so the label itself
    // signals that the deck (not just a read-only weapon list) can be
    // adjusted here, per explicit request ("Der user soll wissen dass er
    // das Deck anpassen kann").
    weapons: 'Weapon Deck',
    shields: 'Shields',
    monsters: 'Monsters',
    howToPlay: 'How to Play',
    tutorial: 'Tutorial',
    options: 'Options',
    roomEmptyTagline: 'The dungeon awaits...',

    // --- game screen ---
    openMenuAria: 'Open menu',
    deckCount: 'Deck: {n} cards left',
    hpText: '{hp} / {maxHp} HP',
    manaText: '{mana} / {maxMana} Mana',
    fleeRoom: 'Flee Room',
    noWeaponEquipped: 'No weapon equipped',
    fightingBareHanded: 'Fighting bare-handed',
    canDefeatAny: 'Can defeat any monster',
    canOnlyDefeatWeaker: 'Can only defeat monsters weaker than {n}',
    masteryOverrides: 'Weapon Mastery overrides the degrade limit ({n} left)',
    // Ranged weapons ignore the degrade limit entirely (see "Ranged
    // Weapons" in CLAUDE.md) — shown in #weapon-status instead of
    // canOnlyDefeatWeaker/canDefeatAny whenever a ranged weapon is equipped.
    rangedWeaponStatus: 'No degrade limit, {filled} / {total} arrows left',
    // Mage Staffs ignore the degrade limit entirely too (see "Mage Staffs"
    // in CLAUDE.md), shown in #weapon-status instead of the melee/ranged
    // lines whenever one is equipped — mageWeaponStatusNoMana is shown
    // instead of mageWeaponStatus whenever there isn't currently enough of
    // the shared mana pool banked to fire it.
    mageWeaponStatus: 'No degrade limit, costs {n} mana per shot',
    mageWeaponStatusNoMana: 'No degrade limit, not enough mana to fire (needs {n})',
    weaponToggleLabel: 'Using weapon',
    fleeCantTwice: "Can't flee two rooms in a row",
    fleeCantThrice: "Can't flee three rooms in a row",
    fleeOnlyFullRoom: 'Can only flee a full, untouched room',
    championAbilityAria: 'Champion ability',
    championAbilityTitle: "{name}'s ability ({cost} mana)",
    cancelTargetingAria: 'Cancel targeting',
    abilityInfoAria: 'Ability info',
    fragileBarTitle: '{filled} / {total} uses left before this weapon breaks',
    ammoBarTitle: '{filled} / {total} arrows left before this weapon breaks',
    paladinProgress: "{filled} / {total} kills until Paladin's heal",
    rogueProgress: '{filled} / {total} rooms fled in a row',
    herbalistProgress: '{filled} / {total} potions healed this room',

    // --- menu / rules ---
    closeMenuAria: 'Close menu',
    mainMenu: 'Main Menu',

    // --- gameover overlay ---
    victory: 'Victory',
    defeat: 'Defeat',
    playAgain: 'Play Again',

    // --- galleries / champion select / detail popup ---
    close: 'Close',
    galleryTitleWeapons: 'Weapons',
    galleryTitleMonsters: 'Monsters',
    galleryTitleShields: 'Shields',
    galleryTitleChampions: 'Champions',
    // Section headings splitting the Weapons gallery into its two
    // categories (see renderGallery() in js/ui.js) — not separate gallery
    // buttons/titles, just headings inside the one Weapons grid.
    galleryHeadingMeleeWeapons: 'Close Range',
    galleryHeadingRangedWeapons: 'Ranged',
    galleryHeadingMageWeapons: 'Mage Staffs',
    strengthLabel: 'Strength {n}',
    blockLabel: 'Block {n}',
    rangedAmmoSentence: 'Carries {n} arrows.',
    mageManaSentence: 'Costs {n} mana per shot, never breaks.',
    passiveAbilityLabel: 'Passive Ability',
    activeAbilityLabel: 'Active Ability',
    chooseChampionTitle: 'Choose your Champion',

    // --- Deckbuilder (weapon loadout, replaces the old Weapons gallery —
    // see js/deckbuilder.js and renderDeckbuilder() in js/ui.js) ---
    deckbuilderTitle: 'Deckbuilder',
    deckbuilderLoadoutHeading: 'Your Loadout',
    deckbuilderAvailableHeading: 'Available Weapons',
    deckbuilderSlotsLabel: '{n} / {max} slots',
    deckbuilderBudgetLabel: '{n} / {max} points',
    deckbuilderCostTitle: 'Deck cost: {n} points',

    // --- options overlay ---
    optionsTitle: 'Options',
    languageLabel: 'Language',

    // --- tutorial ---
    skipTutorial: 'Skip Tutorial ✕',
    tutorialNext: 'Next',
    tutorialStart: 'Start Tutorial',
    tutorialFinish: 'Finish',
    tutorialWelcome:
      'Welcome to Scoundrel! This tutorial walks you through one real, pre-arranged dungeon run so you can see every rule in action. Click Start to begin.',
    tutorialStep1:
      'This is a Monster card. Its number is how much damage it deals. You have no weapon yet, so click it to fight bare-handed and take full damage.',
    tutorialStep2:
      "This is a Weapon card. Click it to equip it, it'll reduce damage from monsters you fight next.",
    tutorialStep3:
      'Fight this monster with your weapon equipped: damage = monster strength minus weapon strength.',
    tutorialStep4:
      'Only 3 of the 4 room cards get resolved each round. The 4th, like this Health Potion, carries into the next room. Click it to drink and heal HP.',
    tutorialStep5:
      "Only the first potion in a room actually heals. This one won't. Click it to see.",
    tutorialStep6:
      "This monster (55) is stronger than the last one your weapon defeated (46), so the weapon can't be used on it, that's its wear rule. You will fight it bare-handed.",
    tutorialStep7:
      "Shields are a third equippable item. Click to equip it, it'll block some incoming damage and has its own durability.",
    tutorialStep8:
      'Fight this one, your shield will absorb whatever damage still gets through after your weapon.',
    tutorialStep9:
      'This hits harder than your shield has durability left, watch it shatter after blocking what it can.',
    tutorialStep10:
      "You can avoid an entire room once, but not twice in a row. Click 'Flee Room' to send this whole room to the bottom of the deck.",
    tutorialStep11:
      "Notice 'Flee Room' is now disabled. You can't flee two rooms in a row. For now, drink this potion to heal back up.",
    tutorialStep12:
      "Every champion has an active ability, powered by mana (the ring around this button) gained from clearing or fleeing rooms. Paladin's Blessing reduces your next 3 hits by 10 damage each. Click to activate it.",
    tutorialStep13: 'Now fight this monster. Blessing will cut the damage you take by 10.',
    tutorialFinal:
      "That's the essentials: monsters, weapons and their wear, potions and their limit, shields, fleeing, and your champion's ability. You're ready, good luck in the real dungeon!",

    // --- dynamic gameplay messages (js/state.js) ---
    backstabHint: 'Choose a monster to backstab, or click ✕ to cancel.',
    abilityRogueReady: '{name} readies a Backstab, choose a monster to strike.',
    abilityPaladinBlessing: '{name} calls down a blessing, the next 3 hits deal 10 less damage.',
    abilityHerbalistHealed: "{name} channels nature's grace, healed {healed} HP.",
    abilityHerbalistFull:
      "{name} channels nature's grace, already at full health, no effect.",
    abilityBerserkerFrenzy:
      '{name} flies into a frenzy, bare-handed hits take 40 less damage for the next 2 fights.',
    abilitySwordmasterMastery:
      "{name} calls on years of training, the weapon ignores its degrade limit for the next 3 fights.",
    abilityNotImplemented: "{name}'s ability isn't implemented yet, mana spent.",
    backstabCancelled: 'Backstab cancelled.',
    backstabHit: '{name} backstabs {monster} for 30 damage!',
    fightWithWeapon: 'Fought {monster} with your {weapon}, took {damage} damage.',
    fightBareHanded: 'Fought {monster} bare-handed, took {damage} damage.',
    fightVampiricSuffix: ' Vampiric weapon healed 5 HP.',
    fightElectricSuffix: ' Electric surge damaged the other monsters!',
    // Ranged weapons (see "Ranged Weapons" in CLAUDE.md): a shot that
    // doesn't kill leaves the monster in the room at its lower strength;
    // rangedRetaliateSuffix is appended only on the 20% chance it strikes
    // back before you can finish it off.
    rangedKillMessage: 'Shot {monster} with your {weapon} for {damage} damage, defeating it.',
    rangedHitMessage: 'Shot {monster} with your {weapon} for {damage} damage, it has {remaining} strength left.',
    rangedRetaliateSuffix: ' It struck back for {n} damage!',
    // Mage Staffs (see "Mage Staffs" in CLAUDE.md): same shape as the ranged
    // messages above, just cast rather than shot.
    mageKillMessage: 'Blasted {monster} with your {weapon} for {damage} damage, defeating it.',
    mageHitMessage: 'Blasted {monster} with your {weapon} for {damage} damage, it has {remaining} strength left.',
    mageRetaliateSuffix: ' It struck back for {n} damage!',
    fightFragileShattered: ' Your fragile {weapon} shatters!',
    fightFragileCrackingSingular: ' Your fragile {weapon} is cracking (1 use left).',
    fightFragileCrackingPlural: ' Your fragile {weapon} is cracking ({n} uses left).',
    paladinHealSuffix: " Paladin's faith healed {n} HP.",
    blessingAbsorbedLeft: ' Blessing absorbed 10 damage ({n} left).',
    blessingAbsorbedFaded: ' Blessing absorbed 10 damage, it has faded.',
    frenzyActiveLeft: ' Frenzy is active ({n} left).',
    frenzyFaded: ' Frenzy has faded.',
    masteryActiveLeft: ' Weapon Mastery is active ({n} left).',
    masteryFaded: ' Weapon Mastery has faded.',
    masteryOverpoweredLeft: " Weapon Mastery overpowered the weapon's limit ({n} left).",
    masteryOverpoweredFaded: " Weapon Mastery overpowered the weapon's limit, it has faded.",
    shieldBlocked: ' Your {shield} blocked {n} damage.',
    shieldBlockedShattered: ' Your {shield} blocked {n} damage and shattered!',
    equippedWeapon: 'Equipped {weapon}.',
    equippedShield: 'Equipped {shield}.',
    potionNoEffect: 'Drank {potion}, already healed in this room, no effect.',
    potionHealed: 'Drank {potion}, healed {n} HP.',
    diedSuffix: ' You died!',
    winAllMonstersSuffix: ' All monsters defeated, the dungeon is cleared, you win!',
    winDungeonClearedSuffix: ' The dungeon is cleared, you win!',
    fleeOnlyFullRoomMessage: 'You can only flee a full room, before fighting or equipping anything in it.',
    fleeCantTwiceMessage: "You can't flee two rooms in a row.",
    fleeCantThriceMessage: "You can't flee three rooms in a row.",
    fledSuccess: 'You fled the room, it was sent to the bottom of the deck.',

    // --- rules text (#rules, index.html) ---
    rulesHtml: `
      <h3>The Dungeon Deck</h3>
      <p>47 cards, each with its own artwork and a strength from 10 to 70.</p>
      <ul>
        <li><strong>Monsters</strong>: a whole bestiary of creatures.</li>
        <li><strong>Weapons</strong>: strength 10–50, so you don't have to fight bare-handed.</li>
        <li><strong>Potions</strong>: strength 10–50, heals that many HP when drunk.</li>
      </ul>
      <h3>Rooms</h3>
      <p>Four cards are dealt face-up as a room. Click a card to resolve it. Once only one card is left, three new cards are drawn to refill the room back to four.</p>

      <h3>Fighting Monsters</h3>
      <p>Click a monster to fight it. With a weapon equipped and "Using weapon" switched on, you take damage equal to the monster's strength minus your weapon's strength (never less than 0), but a weapon can only be used again on a monster weaker than the last one it defeated. Turn "Using weapon" off to always fight bare-handed for full damage instead.</p>

      <h3>Weapons &amp; Potions</h3>
      <p>Click a weapon to equip it, it replaces whatever you had equipped. Click a potion to drink it and heal HP up to your maximum of 100, but only the first potion in a room actually heals; extra potions in the same room do nothing.</p>

      <h3>Ranged Weapons</h3>
      <p>Bows work differently from melee weapons: a bow's strength is subtracted directly from the monster's strength instead of reducing the damage you take. If that doesn't kill the monster, it stays in the room weaker than before, and there's a 20% chance it strikes back before you can finish it off. A bow ignores the weapon degrade rule, but only carries 3 arrows (shown as a bar under the weapon slot) — once they're spent, it shatters.</p>

      <h3>Mage Staffs</h3>
      <p>Staffs and scepters work like bows (strength subtracted directly from the monster's, same 20% chance it strikes back), hit noticeably harder, and never break, but instead of arrows each shot costs mana from the same pool your champion's active ability uses. If you're out of mana, the weapon slot grays out and you'll fight bare-handed instead until you've collected more.</p>

      <h3>Shields</h3>
      <p>Click a shield to equip it, it replaces whatever you had equipped. A shield blocks damage that would otherwise get through, after your weapon (or bare hands) has already done its part, the shield absorbs as much of the remaining damage as its block value allows. Blocking costs the shield durability equal to the damage it absorbed; once its durability reaches 0, it shatters and is gone.</p>

      <h3>Weapon Effects</h3>
      <p>Every weapon has a 25% chance of carrying one of four effects, shown as a small symbol in its corner:</p>
      <ul>
        <li><strong>Vampiric</strong>: heals 5 HP whenever this weapon defeats a monster.</li>
        <li><strong>Electric</strong>: every other revealed monster loses 5 strength whenever this weapon is used in a fight (still the same monster, just weaker).</li>
        <li><strong>Sturdy</strong>: this weapon's usable strength can never drop by more than 10 per fight, instead of dropping straight to the defeated monster's value.</li>
        <li><strong>Fragile</strong>: breaks after 2 uses, no matter which monster it's used on.</li>
      </ul>

      <h3>Champions</h3>
      <p>Before each game you pick a champion, who grants one passive ability for that whole run, plus a mana-costed active ability you can trigger yourself once you've collected enough mana (gained by clearing or fleeing rooms):</p>
      <ul>
        <li>
          <strong>Paladin</strong>
          <br><strong>Passive:</strong> every 5 monsters you defeat, heal 10 HP.
          <br><strong>Active, Blessing:</strong> the next 3 hits that would deal damage are reduced by 10 each.
        </li>
        <li>
          <strong>Herbalist</strong>
          <br><strong>Passive:</strong> you can drink two potions per room instead of just one.
          <br><strong>Active, Nature's Grace:</strong> instantly heals 25 HP.
        </li>
        <li>
          <strong>Rogue</strong>
          <br><strong>Passive:</strong> you may flee two rooms in a row instead of just one.
          <br><strong>Active, Backstab:</strong> choose a monster to strike it for 30 damage.
        </li>
        <li>
          <strong>Berserker</strong>
          <br><strong>Passive:</strong> fighting bare-handed, you take 10 less damage from every monster.
          <br><strong>Active, Frenzy:</strong> for the next 2 fights, bare-handed hits take 40 less damage instead of 10.
        </li>
        <li>
          <strong>Sword Master</strong>
          <br><strong>Passive:</strong> your weapon's degrade limit never drops by more than 15 per fight.
          <br><strong>Active, Weapon Mastery:</strong> for the next 3 weapon fights, the weapon ignores its degrade limit and can strike any monster.
        </li>
      </ul>
      <p>The ring around your ability button shows your banked mana. You gain 1 mana every time a room is cleared or fled, up to your champion's ability cost. Once the ring is full, the button lights up and you can click it to trigger your active ability, which spends all of it.</p>

      <h3>Fleeing a Room</h3>
      <p>"Flee Room" sends the entire room to the bottom of the deck and deals a fresh one. You can only flee a full, untouched room of 4 cards, and never two rooms in a row.</p>

      <h3>Winning &amp; Losing</h3>
      <p>Clear all 47 cards from the dungeon to win. If your HP drops to 0, you lose.</p>
    `,
  },

  de: {
    // --- loading screen ---
    loadingText: 'Lädt ... {pct}%',

    // --- start screen ---
    startTagline: 'Ein Dungeon-Crawler-Kartenspiel',
    newGame: 'Neues Spiel',
    champions: 'Champions',
    // See the English key's comment — "Waffendeck", not just "Waffen", so
    // the label itself signals the deck can be adjusted here.
    weapons: 'Waffendeck',
    shields: 'Schilde',
    monsters: 'Monster',
    howToPlay: 'Anleitung',
    tutorial: 'Tutorial',
    options: 'Optionen',
    roomEmptyTagline: 'Das Dungeon wartet...',

    // --- game screen ---
    openMenuAria: 'Menü öffnen',
    deckCount: 'Deck: {n} Karten übrig',
    hpText: '{hp} / {maxHp} LP',
    manaText: '{mana} / {maxMana} Mana',
    fleeRoom: 'Raum fliehen',
    noWeaponEquipped: 'Keine Waffe ausgerüstet',
    fightingBareHanded: 'Kämpfst bloßhändig',
    canDefeatAny: 'Kann jedes Monster besiegen',
    canOnlyDefeatWeaker: 'Kann nur Monster schwächer als {n} besiegen',
    masteryOverrides: 'Waffenmeisterschaft hebt die Abnutzungsgrenze auf ({n} übrig)',
    rangedWeaponStatus: 'Keine Abnutzungsgrenze, {filled} / {total} Pfeile übrig',
    mageWeaponStatus: 'Keine Abnutzungsgrenze, kostet {n} Mana pro Schuss',
    mageWeaponStatusNoMana: 'Keine Abnutzungsgrenze, nicht genug Mana zum Schießen (benötigt {n})',
    weaponToggleLabel: 'Waffe benutzen',
    fleeCantTwice: 'Kann nicht zwei Räume hintereinander fliehen',
    fleeCantThrice: 'Kann nicht drei Räume hintereinander fliehen',
    fleeOnlyFullRoom: 'Kann nur einen vollen, unberührten Raum fliehen',
    championAbilityAria: 'Champion-Fähigkeit',
    championAbilityTitle: '{name}s Fähigkeit ({cost} Mana)',
    cancelTargetingAria: 'Zielen abbrechen',
    abilityInfoAria: 'Fähigkeitsinfo',
    fragileBarTitle: '{filled} / {total} Anwendungen übrig, bevor diese Waffe zerbricht',
    ammoBarTitle: '{filled} / {total} Pfeile übrig, bevor diese Waffe zerbricht',
    paladinProgress: '{filled} / {total} Kills bis zur Heilung des Paladins',
    rogueProgress: '{filled} / {total} Räume in Folge geflohen',
    herbalistProgress: '{filled} / {total} Tränke haben in diesem Raum geheilt',

    // --- menu / rules ---
    closeMenuAria: 'Menü schließen',
    mainMenu: 'Hauptmenü',

    // --- gameover overlay ---
    victory: 'Sieg',
    defeat: 'Niederlage',
    playAgain: 'Erneut spielen',

    // --- galleries / champion select / detail popup ---
    close: 'Schließen',
    galleryTitleWeapons: 'Waffen',
    galleryTitleMonsters: 'Monster',
    galleryTitleShields: 'Schilde',
    galleryTitleChampions: 'Champions',
    galleryHeadingMeleeWeapons: 'Nahkampf',
    galleryHeadingRangedWeapons: 'Fernkampf',
    galleryHeadingMageWeapons: 'Magierstäbe',
    strengthLabel: 'Stärke {n}',
    blockLabel: 'Blockwert {n}',
    rangedAmmoSentence: 'Trägt {n} Pfeile.',
    mageManaSentence: 'Kostet {n} Mana pro Schuss, zerbricht nie.',
    passiveAbilityLabel: 'Passive Fähigkeit',
    activeAbilityLabel: 'Aktive Fähigkeit',
    chooseChampionTitle: 'Wähle deinen Champion',

    // --- Deckbuilder (Waffen-Loadout, ersetzt die alte Waffen-Galerie —
    // siehe js/deckbuilder.js und renderDeckbuilder() in js/ui.js) ---
    deckbuilderTitle: 'Deckbuilder',
    deckbuilderLoadoutHeading: 'Deine Ausrüstung',
    deckbuilderAvailableHeading: 'Verfügbare Waffen',
    deckbuilderSlotsLabel: '{n} / {max} Plätze',
    deckbuilderBudgetLabel: '{n} / {max} Punkte',
    deckbuilderCostTitle: 'Deckwert: {n} Punkte',

    // --- options overlay ---
    optionsTitle: 'Optionen',
    languageLabel: 'Sprache',

    // --- tutorial ---
    skipTutorial: 'Anleitung überspringen ✕',
    tutorialNext: 'Weiter',
    tutorialStart: 'Anleitung starten',
    tutorialFinish: 'Fertig',
    tutorialWelcome:
      'Willkommen bei Scoundrel! Diese Anleitung führt dich durch einen echten, vorbereiteten Dungeon-Lauf, damit du jede Regel in Aktion siehst. Klicke auf Start, um zu beginnen.',
    tutorialStep1:
      'Das ist eine Monsterkarte. Ihre Zahl gibt an, wie viel Schaden sie verursacht. Du hast noch keine Waffe, also klicke sie an, um bloßhändig zu kämpfen und vollen Schaden zu nehmen.',
    tutorialStep2:
      'Das ist eine Waffenkarte. Klicke sie an, um sie auszurüsten, sie verringert den Schaden von Monstern, die du als Nächstes bekämpfst.',
    tutorialStep3:
      'Bekämpfe dieses Monster mit ausgerüsteter Waffe: Schaden = Monsterstärke minus Waffenstärke.',
    tutorialStep4:
      'Nur 3 der 4 Raumkarten werden pro Runde aufgelöst. Die vierte, wie dieser Heiltrank, wandert in den nächsten Raum. Klicke ihn an, um zu trinken und LP zu heilen.',
    tutorialStep5:
      'Nur der erste Trank in einem Raum heilt tatsächlich. Dieser hier nicht. Klicke ihn an, um es zu sehen.',
    tutorialStep6:
      'Dieses Monster (55) ist stärker als das letzte, das deine Waffe besiegt hat (46), daher kann die Waffe nicht gegen es eingesetzt werden, das ist ihre Abnutzungsregel. Du wirst bloßhändig gegen es kämpfen.',
    tutorialStep7:
      'Schilde sind eine dritte ausrüstbare Item-Art. Klicke ihn an, um ihn auszurüsten, er blockt eingehenden Schaden und hat eine eigene Haltbarkeit.',
    tutorialStep8:
      'Bekämpfe dieses Monster, dein Schild absorbiert, was nach deiner Waffe noch an Schaden durchkommt.',
    tutorialStep9:
      'Dieses Monster trifft härter, als dein Schild noch Haltbarkeit hat, sieh zu, wie er zerbricht, nachdem er geblockt hat, was er konnte.',
    tutorialStep10:
      "Du kannst einen ganzen Raum einmal meiden, aber nicht zweimal hintereinander. Klicke auf 'Raum fliehen', um diesen gesamten Raum ans Ende des Decks zu schicken.",
    tutorialStep11:
      "Beachte, dass 'Raum fliehen' jetzt deaktiviert ist. Du kannst nicht zwei Räume hintereinander fliehen. Trink für jetzt diesen Trank, um dich wieder zu heilen.",
    tutorialStep12:
      'Jeder Champion hat eine aktive Fähigkeit, angetrieben durch Mana (der Ring um diesen Button), das du durch Räumen oder Fliehen von Räumen erhältst. Der Segen des Paladins verringert deine nächsten 3 Treffer um je 10 Schaden. Klicke, um sie zu aktivieren.',
    tutorialStep13: 'Bekämpfe jetzt dieses Monster. Der Segen verringert den Schaden, den du erleidest, um 10.',
    tutorialFinal:
      'Das waren die Grundlagen: Monster, Waffen und ihre Abnutzung, Tränke und ihr Limit, Schilde, Fliehen und die Fähigkeit deines Champions. Du bist bereit, viel Glück im echten Dungeon!',

    // --- dynamic gameplay messages (js/state.js) ---
    backstabHint: 'Wähle ein Monster für den Hinterhalt, oder klicke ✕ zum Abbrechen.',
    abilityRogueReady: '{name} bereitet einen Hinterhalt vor, wähle ein Monster zum Angreifen.',
    abilityPaladinBlessing:
      '{name} ruft einen Segen herab, die nächsten 3 Treffer verursachen 10 weniger Schaden.',
    abilityHerbalistHealed: '{name} kanalisiert die Gnade der Natur, {healed} LP geheilt.',
    abilityHerbalistFull:
      '{name} kanalisiert die Gnade der Natur, bereits bei voller Gesundheit, keine Wirkung.',
    abilityBerserkerFrenzy:
      '{name} verfällt in Raserei, bloßhändige Treffer verursachen für die nächsten 2 Kämpfe 40 statt 10 weniger Schaden.',
    abilitySwordmasterMastery:
      '{name} ruft jahrelanges Training ab, die Waffe ignoriert für die nächsten 3 Kämpfe ihre Abnutzungsgrenze.',
    abilityNotImplemented: '{name}s Fähigkeit ist noch nicht implementiert, Mana wurde verbraucht.',
    backstabCancelled: 'Hinterhalt abgebrochen.',
    backstabHit: '{name} greift {monster} hinterrücks an, 30 Schaden!',
    fightWithWeapon: 'Hast {monster} mit deiner {weapon} bekämpft, {damage} Schaden erlitten.',
    fightBareHanded: 'Hast {monster} bloßhändig bekämpft, {damage} Schaden erlitten.',
    fightVampiricSuffix: ' Die vampirische Waffe hat 5 LP geheilt.',
    fightElectricSuffix: ' Ein elektrischer Stoß hat die anderen Monster geschädigt!',
    rangedKillMessage: '{monster} mit deiner {weapon} für {damage} Schaden beschossen und besiegt.',
    rangedHitMessage: '{monster} mit deiner {weapon} für {damage} Schaden beschossen, es hat noch {remaining} Stärke.',
    rangedRetaliateSuffix: ' Es hat für {n} Schaden zurückgeschlagen!',
    mageKillMessage: '{monster} mit deiner {weapon} für {damage} Schaden beschossen und besiegt.',
    mageHitMessage: '{monster} mit deiner {weapon} für {damage} Schaden beschossen, es hat noch {remaining} Stärke.',
    mageRetaliateSuffix: ' Es hat für {n} Schaden zurückgeschlagen!',
    fightFragileShattered: ' Deine zerbrechliche {weapon} zerbricht!',
    fightFragileCrackingSingular: ' Deine zerbrechliche {weapon} bekommt Risse (noch 1 Anwendung übrig).',
    fightFragileCrackingPlural: ' Deine zerbrechliche {weapon} bekommt Risse (noch {n} Anwendungen übrig).',
    paladinHealSuffix: ' Der Glaube des Paladins hat {n} LP geheilt.',
    blessingAbsorbedLeft: ' Der Segen hat 10 Schaden absorbiert ({n} übrig).',
    blessingAbsorbedFaded: ' Der Segen hat 10 Schaden absorbiert und ist nun verblasst.',
    frenzyActiveLeft: ' Die Raserei ist aktiv ({n} übrig).',
    frenzyFaded: ' Die Raserei ist verklungen.',
    masteryActiveLeft: ' Die Waffenmeisterschaft ist aktiv ({n} übrig).',
    masteryFaded: ' Die Waffenmeisterschaft ist verklungen.',
    masteryOverpoweredLeft: ' Die Waffenmeisterschaft hat die Grenze der Waffe überwunden ({n} übrig).',
    masteryOverpoweredFaded: ' Die Waffenmeisterschaft hat die Grenze der Waffe überwunden und ist nun verklungen.',
    shieldBlocked: ' Dein {shield} hat {n} Schaden geblockt.',
    shieldBlockedShattered: ' Dein {shield} hat {n} Schaden geblockt und ist zerbrochen!',
    equippedWeapon: '{weapon} ausgerüstet.',
    equippedShield: '{shield} ausgerüstet.',
    potionNoEffect: '{potion} getrunken, in diesem Raum schon geheilt, keine Wirkung.',
    potionHealed: '{potion} getrunken, {n} LP geheilt.',
    diedSuffix: ' Du bist gestorben!',
    winAllMonstersSuffix: ' Alle Monster besiegt, das Dungeon ist geräumt, du hast gewonnen!',
    winDungeonClearedSuffix: ' Das Dungeon ist geräumt, du hast gewonnen!',
    fleeOnlyFullRoomMessage: 'Du kannst nur einen vollen Raum fliehen, bevor du etwas darin bekämpft oder ausgerüstet hast.',
    fleeCantTwiceMessage: 'Du kannst nicht zwei Räume hintereinander fliehen.',
    fleeCantThriceMessage: 'Du kannst nicht drei Räume hintereinander fliehen.',
    fledSuccess: 'Du bist aus dem Raum geflohen, er wurde unten ans Deck gelegt.',

    // --- rules text (#rules, index.html) ---
    rulesHtml: `
      <h3>Das Dungeon-Deck</h3>
      <p>47 Karten, jede mit eigener Grafik und einer Stärke von 10 bis 70.</p>
      <ul>
        <li><strong>Monster</strong>: ein ganzes Bestiarium an Kreaturen.</li>
        <li><strong>Waffen</strong>: Stärke 10–50, damit du nicht bloßhändig kämpfen musst.</li>
        <li><strong>Tränke</strong>: Stärke 10–50, heilt beim Trinken entsprechend viele LP.</li>
      </ul>
      <h3>Räume</h3>
      <p>Vier Karten werden offen als Raum ausgelegt. Klicke eine Karte an, um sie aufzulösen. Sobald nur noch eine Karte übrig ist, werden drei neue Karten gezogen, um den Raum wieder auf vier aufzufüllen.</p>

      <h3>Gegen Monster kämpfen</h3>
      <p>Klicke ein Monster an, um es zu bekämpfen. Mit ausgerüsteter Waffe und aktiviertem "Waffe benutzen" erleidest du Schaden in Höhe der Monsterstärke minus deiner Waffenstärke (nie weniger als 0), aber eine Waffe kann danach nur noch gegen ein schwächeres Monster als das zuletzt besiegte eingesetzt werden. Schalte "Waffe benutzen" aus, um immer bloßhändig mit vollem Schaden zu kämpfen.</p>

      <h3>Waffen &amp; Tränke</h3>
      <p>Klicke eine Waffe an, um sie auszurüsten, sie ersetzt deine bisherige Ausrüstung. Klicke einen Trank an, um ihn zu trinken und LP bis zu deinem Maximum von 100 zu heilen, aber nur der erste Trank in einem Raum heilt tatsächlich, weitere Tränke im selben Raum bewirken nichts.</p>

      <h3>Fernkampfwaffen</h3>
      <p>Bögen funktionieren anders als Nahkampfwaffen: die Stärke des Bogens wird direkt von der Stärke des Monsters abgezogen, statt den erlittenen Schaden zu verringern. Überlebt das Monster den Schuss, bleibt es geschwächt im Raum liegen, und es besteht eine Chance von 20%, dass es zurückschlägt, bevor du es endgültig besiegst. Ein Bogen ignoriert die Abnutzungsgrenze, trägt aber nur 3 Pfeile (angezeigt als Leiste unter dem Waffenslot), sind sie aufgebraucht, zerbricht er.</p>

      <h3>Magierstäbe</h3>
      <p>Stäbe und Zepter funktionieren wie Bögen (Stärke wird direkt von der des Monsters abgezogen, dieselbe Chance von 20%, dass es zurückschlägt), schlagen aber spürbar härter zu und zerbrechen nie. Statt Pfeilen kostet jeder Schuss Mana aus demselben Vorrat, den auch die aktive Fähigkeit deines Champions nutzt. Ist kein Mana übrig, wird der Waffenslot grau und du kämpfst stattdessen bloßhändig, bis du wieder genug gesammelt hast.</p>

      <h3>Schilde</h3>
      <p>Klicke einen Schild an, um ihn auszurüsten, er ersetzt deine bisherige Ausrüstung. Ein Schild blockt Schaden, der sonst durchkommen würde, nachdem deine Waffe (oder bloße Hände) bereits ihren Teil erledigt hat, absorbiert der Schild so viel vom verbleibenden Schaden, wie sein Blockwert erlaubt. Das Blocken kostet den Schild Haltbarkeit in Höhe des absorbierten Schadens, sobald seine Haltbarkeit 0 erreicht, zerbricht er und ist verloren.</p>

      <h3>Waffeneffekte</h3>
      <p>Jede Waffe hat eine Chance von 25%, einen von vier Effekten zu tragen, angezeigt als kleines Symbol in ihrer Ecke:</p>
      <ul>
        <li><strong>Vampirisch</strong>: heilt 5 LP, wenn diese Waffe ein Monster besiegt.</li>
        <li><strong>Elektrisch</strong>: jedes andere aufgedeckte Monster verliert 5 Stärke, wenn diese Waffe in einem Kampf eingesetzt wird (bleibt dasselbe Monster, nur schwächer).</li>
        <li><strong>Robust</strong>: die einsetzbare Stärke dieser Waffe kann pro Kampf nie um mehr als 10 sinken, statt direkt auf den Wert des besiegten Monsters zu fallen.</li>
        <li><strong>Zerbrechlich</strong>: zerbricht nach 2 Anwendungen, egal gegen welches Monster.</li>
      </ul>

      <h3>Champions</h3>
      <p>Vor jedem Spiel wählst du einen Champion, der dir eine passive Fähigkeit für den ganzen Lauf verleiht, sowie eine manakostende aktive Fähigkeit, die du selbst auslösen kannst, sobald du genug Mana gesammelt hast (gewonnen durch Räumen oder Fliehen von Räumen):</p>
      <ul>
        <li>
          <strong>Paladin</strong>
          <br><strong>Passiv:</strong> alle 5 besiegten Monster heilst du 10 LP.
          <br><strong>Aktiv, Segen:</strong> die nächsten 3 Treffer, die Schaden verursachen würden, werden um je 10 verringert.
        </li>
        <li>
          <strong>Kräuterkundige</strong>
          <br><strong>Passiv:</strong> du kannst zwei Tränke pro Raum trinken statt nur einen.
          <br><strong>Aktiv, Gnade der Natur:</strong> heilt sofort 25 LP.
        </li>
        <li>
          <strong>Schurke</strong>
          <br><strong>Passiv:</strong> du darfst zwei Räume hintereinander fliehen statt nur einen.
          <br><strong>Aktiv, Hinterhalt:</strong> wähle ein Monster, um ihm 30 Schaden zuzufügen.
        </li>
        <li>
          <strong>Berserker</strong>
          <br><strong>Passiv:</strong> im bloßhändigen Kampf erleidest du 10 weniger Schaden von jedem Monster.
          <br><strong>Aktiv, Raserei:</strong> für die nächsten 2 Kämpfe verursachen bloßhändige Treffer 40 statt 10 weniger Schaden.
        </li>
        <li>
          <strong>Schwertmeister</strong>
          <br><strong>Passiv:</strong> die Abnutzungsgrenze deiner Waffe sinkt pro Kampf nie um mehr als 15.
          <br><strong>Aktiv, Waffenmeisterschaft:</strong> für die nächsten 3 Waffenkämpfe ignoriert die Waffe ihre Abnutzungsgrenze und kann jedes Monster treffen.
        </li>
      </ul>
      <p>Der Ring um deinen Fähigkeiten-Button zeigt dein gesammeltes Mana. Du erhältst 1 Mana, jedes Mal wenn ein Raum geräumt oder verlassen wird, bis zu den Kosten deines Champions. Sobald der Ring voll ist, leuchtet der Button auf und du kannst ihn anklicken, um deine aktive Fähigkeit auszulösen, was das gesamte Mana verbraucht.</p>

      <h3>Einen Raum fliehen</h3>
      <p>"Raum fliehen" schickt den gesamten Raum ans Ende des Decks und teilt einen neuen aus. Du kannst nur einen vollen, unberührten Raum von 4 Karten fliehen, und nie zwei Räume hintereinander.</p>

      <h3>Gewinnen &amp; Verlieren</h3>
      <p>Räume alle 47 Karten aus dem Dungeon, um zu gewinnen. Fällt deine LP auf 0, verlierst du.</p>
    `,
  },
};

/** Translates `key` for the current language (see getLang() above),
 * substituting any `{placeholder}` tokens found in `vars`. Falls back to
 * the English string, then to the bare key itself, if a translation is
 * ever missing — so a forgotten key shows up as visibly wrong text instead
 * of a blank UI or a thrown error. */
function t(key, vars) {
  const lang = getLang();
  let str = (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
  if (vars) {
    Object.keys(vars).forEach((name) => {
      str = str.split(`{${name}}`).join(vars[name]);
    });
  }
  return str;
}
