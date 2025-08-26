


import type { FullGameState, GameAction, Player, Unit, CardData, UnitEffect, EffectType } from '../types';
import { GamePhase, PlayerID, Wave } from '../types';
import { HAND_SIZE, LEADER_HEALTH, ACTIONS_PER_TURN, PLAYER1_NAME, PLAYER2_NAME, WAVE_ORDER } from '../constants';
import { SKELETON_TOKEN, TURRET_TOKEN, GOBLIN_TOKEN, HYDRA_HEAD_TOKEN, STONE_WALL_TOKEN, ILLUSION_TOKEN, SPIDER_TOKEN, WOLF_TOKEN, LEGIONNAIRE_TOKEN, VAMPIRE_SPAWN_TOKEN, GHOUL_TOKEN, SHEEP_TOKEN, BOMB_TRAP_TOKEN } from './tokens';
import { staticDeck } from '../services/staticCardData';

// --- UTILITY FUNCTIONS ---

const shuffleDeck = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const addLogEntry = (log: string[], message: string): string[] => {
    const updatedLog = [message, ...log];
    return updatedLog.slice(0, 100);
};

const getOtherPlayerId = (playerId: PlayerID): PlayerID => playerId === PlayerID.Player1 ? PlayerID.Player2 : PlayerID.Player1;

// --- EFFECT & STAT HELPERS ---
const hasEffect = (unit: Unit, effectType: EffectType): boolean => unit.effects.some(e => e.type === effectType);

const getEffectValue = (unit: Unit, effectType: EffectType, aggregate: boolean = true): number => {
    const effects = unit.effects.filter(e => e.type === effectType);
    if (effects.length === 0) return 0;
    if (aggregate) {
        return effects.reduce((sum, e) => sum + (e.value || 0), 0);
    }
    return effects[0].value || 0;
};

const getUnitTotalAttack = (unit: Unit, state?: FullGameState): number => {
    let base = unit.card.attack;
    if (hasEffect(unit, 'TRANSFORMED')) {
        const transformEffect = unit.effects.find(e => e.type === 'TRANSFORMED');
        if (transformEffect) base = transformEffect.payload.card.attack;
    }
    const buffDebuff = unit.effects.filter(e => e.type === 'ATTACK_BUFF').reduce((sum, e) => sum + (e.value || 0), 0);
    const enrageBonus = hasEffect(unit, 'ENRAGED') && unit.currentHealth < unit.maxHealth ? (unit.card.id === 5 ? 2 : 0) : 0;
    const preparingAttackBonus = hasEffect(unit, 'PREPARING_ATTACK') ? base : 0;
    
    let leaderBonus = 0;
    if (state) {
        const opponent = state.players[getOtherPlayerId(unit.owner)];
        if (opponent?.leader.card.id === 14) leaderBonus -= 1; // Witch Leader
        if (opponent?.leader.card.id === 35) leaderBonus -= 1; // Spider Queen Leader (Rear ability is now leader)
        if(unit.owner){
            const owner = state.players[unit.owner];
            if(owner?.leader.card.id === 2 && unit.card.tribe === 'Ассасин') leaderBonus += 1;
            if(owner?.leader.card.id === 3 && unit.card.tribe === 'Эльф') leaderBonus += 1;
            if(owner?.leader.card.id === 5 && unit.card.tribe === 'Огр') leaderBonus += 1;
            if(owner?.leader.card.id === 6 && unit.card.id === TURRET_TOKEN.id) leaderBonus += 1;
            if(owner?.leader.card.id === 8 && unit.card.tribe === 'Элементаль') leaderBonus += 1;
            if(owner?.leader.card.id === 10 && unit.card.id === SKELETON_TOKEN.id) leaderBonus += 1;
            if(owner?.leader.card.id === 22) leaderBonus += 1;
            if(owner?.leader.card.id === 27 && unit.card.tribe === 'Рыцарь') leaderBonus += 1;
            if(owner?.leader.card.id === 29 && unit.currentHealth === unit.maxHealth) leaderBonus += 1;
            if(owner?.leader.card.id === 31 && unit.card.tribe === 'Тролль') leaderBonus += 2; // Regen not attack
        }
    }

    return Math.max(0, base + buffDebuff + enrageBonus + unit.souls + leaderBonus + preparingAttackBonus);
};

const getUnitTotalArmor = (unit: Unit): number => getEffectValue(unit, 'ARMOR');
const getUnitTotalRegen = (unit: Unit): number => getEffectValue(unit, 'REGENERATION');

const applyEffect = (unit: Unit, effect: UnitEffect, log: string[] = []): string[] => {
    if (hasEffect(unit, 'IMMUNE_TO_ABILITIES') || (hasEffect(unit, 'SPELL_PROOF') && effect.sourceCardId)) {
        return addLogEntry(log, `${unit.card.name} невосприимчив к эффекту.`);
    }
    // Simple stacking for now
    unit.effects.push(effect);
    return log;
};

const removeEffect = (unit: Unit, effectType: EffectType, all: boolean = false) => {
    if (all) {
        unit.effects = unit.effects.filter(e => e.type !== effectType);
    } else {
        const index = unit.effects.findIndex(e => e.type === effectType);
        if (index > -1) {
            unit.effects.splice(index, 1);
        }
    }
};

const removeAllTemporaryEffects = (unit: Unit) => {
    unit.effects = unit.effects.filter(e => e.duration === -1);
};

// --- UNIT CREATION ---

const createUnitFromCard = (card: CardData, owner: PlayerID, position: { wave: Wave, col: number }): Unit => {
    const unit: Unit = {
        id: `${owner}-${card.id}-${Date.now()}${Math.random()}`,
        card,
        currentHealth: card.health,
        maxHealth: card.health,
        position,
        owner,
        canAttack: false,
        attacksThisTurn: 0,
        souls: 0,
        effects: [],
        isRebirthingFor: 0,
    };

    // --- APPLY INHERENT ABILITIES BASED ON CARD ID AND WAVE ---
    const apply = (effect: UnitEffect) => applyEffect(unit, effect);
    switch (card.id) {
        case 1: if (position.wave === Wave.Vanguard) apply({ type: 'ARMOR', value: 1, duration: -1 }); break;
        case 2: if (position.wave === Wave.Vanguard) apply({ type: 'FIRST_STRIKE', duration: -1 }); if (position.wave === Wave.Flank) apply({ type: 'STEALTH', duration: -1 }); break;
        case 3: if (position.wave === Wave.Vanguard) apply({ type: 'DODGE', value: 50, duration: -1 }); if (position.wave === Wave.Flank) apply({ type: 'IGNORE_VANGUARD', duration: -1 }); if (position.wave === Wave.Rear) apply({ type: 'WINDFURY', duration: -1 }); break;
        case 5: if (position.wave === Wave.Vanguard) apply({ type: 'ENRAGED', duration: -1 }); break;
        case 9: if (position.wave === Wave.Vanguard) apply({ type: 'DIVINE_SHIELD', duration: -1 }); break;
        case 12: if (position.wave === Wave.Vanguard) apply({ type: 'TRAMPLE', duration: -1 }); break;
        case 13: if (position.wave === Wave.Vanguard) apply({ type: 'PROVOKE', duration: -1 }); if (position.wave === Wave.Flank) apply({ type: 'SPELL_PROOF', duration: -1 }); break;
        case 19: if (position.wave === Wave.Vanguard) apply({ type: 'REGENERATION', value: 2, duration: -1 }); break;
        case 25: if (position.wave === Wave.Vanguard) apply({ type: 'PROVOKE', duration: -1 }); break;
        case 27: if(position.wave === Wave.Vanguard) apply({ type: 'IMMUNE_TO_ABILITIES', duration: -1 }); break;
        case 31: if (position.wave === Wave.Vanguard) apply({ type: 'REGENERATION', value: 3, duration: -1 }); break;
        case 34: if (position.wave === Wave.Vanguard) apply({ type: 'COUNTER_ATTACK', duration: -1 }); break;
        case 42: if (position.wave === Wave.Vanguard) apply({ type: 'LIFESTEAL', duration: -1 }); break;
        case 44: if (position.wave === Wave.Vanguard) apply({ type: 'DODGE', value: 50, duration: -1 }); if (position.wave === Wave.Rear) apply({ type: 'IGNORE_VANGUARD', duration: -1 }); break;
        case 48: unit.canAttack = true; break; // Rush
    }
    return unit;
};


// --- INITIAL STATE ---

const createInitialPlayer = (id: PlayerID, name: string, leaderCard: CardData, deck: CardData[], hand: CardData[]): Player => ({
  id,
  name,
  leader: {
    id: `leader-${id}`,
    card: leaderCard,
    currentHealth: LEADER_HEALTH,
    maxHealth: LEADER_HEALTH,
    position: { wave: Wave.Flank, col: 1 },
    owner: id,
    canAttack: true,
    attacksThisTurn: 0,
    souls: 0,
    effects: [],
    isRebirthingFor: 0,
  },
  deck,
  hand,
  discard: [],
  units: [],
  actions: ACTIONS_PER_TURN,
  deadUnits: [],
  banishedUnits: [],
  usedLeaderAbility: false,
});

export const createInitialState = (): FullGameState => ({
  game: {
    phase: GamePhase.MENU,
    currentPlayer: PlayerID.Player1,
    turn: 1,
    winner: null,
    globalEffects: {},
  },
  players: { Player1: null, Player2: null },
  log: [],
  selectedCard: null,
  selectedUnit: null,
});

const cloneState = (state: FullGameState): FullGameState => JSON.parse(JSON.stringify(state));

// --- STATUS AND DEATH RESOLUTION ---

const findDeadUnitsAndLeaders = (players: FullGameState['players']): Unit[] => {
    const dead: Unit[] = [];
    for (const p of Object.values(players)) {
        if (!p) continue;
        p.units.forEach(u => {
            if (u.currentHealth <= 0) dead.push(u);
        });
        if (p.leader.currentHealth <= 0) dead.push(p.leader);
    }
    return dead;
}

const findEmptySlot = (player: Player, preferredWave?: Wave, preferredCol?: number): { wave: Wave; col: number } | null => {
    const occupied = new Set(player.units.map(u => `${u.position.wave}-${u.position.col}`));
    const waves = preferredWave ? [preferredWave, ...WAVE_ORDER.filter(w => w !== preferredWave)] : WAVE_ORDER;

    if(preferredWave && preferredCol !== undefined && !occupied.has(`${preferredWave}-${preferredCol}`)) {
        return { wave: preferredWave, col: preferredCol };
    }

    for (const wave of waves) {
        for (let col = 0; col < 3; col++) {
            if (!occupied.has(`${wave}-${col}`)) {
                return { wave, col };
            }
        }
    }
    return null;
}

const resolveDeaths = (initialState: FullGameState): FullGameState => {
    let state = cloneState(initialState);
    let deathQueue = findDeadUnitsAndLeaders(state.players);
    const processedDeaths = new Set<string>();

    while (deathQueue.length > 0) {
        const victim = deathQueue.shift()!;
        if (processedDeaths.has(victim.id) || victim.currentHealth > 0) continue;
        
        processedDeaths.add(victim.id);
        state.log = addLogEntry(state.log, `${victim.card.name} побежден!`);

        // --- GLOBAL ON-DEATH TRIGGERS ---
        for (const p of Object.values(state.players)) {
            if (!p) continue;
            const isOpponentLeaderSatyr = state.players[getOtherPlayerId(p.id)]?.leader.card.id === 24;

            p.units.forEach(u => {
                if (u.card.id === 37 && u.position.wave === Wave.Vanguard) { // Soulstealer
                    u.souls += 1; u.maxHealth += 1; u.currentHealth += 1;
                    state.log = addLogEntry(state.log, `${u.card.name} поглощает душу!`);
                }
                if (u.card.id === 50 && u.position.wave === Wave.Vanguard) { // Lich King
                    const owner = state.players[u.owner]!;
                    if (owner.units.length < 9) {
                        const emptySlot = findEmptySlot(owner);
                        if(emptySlot) owner.units.push(createUnitFromCard(GHOUL_TOKEN, u.owner, emptySlot));
                    }
                }
                 if (u.card.id === 29 && u.position.wave === Wave.Vanguard && victim.owner !== u.owner) { // Arena Champion
                    u.souls += 1; u.maxHealth += 1; u.currentHealth += 1;
                    state.log = addLogEntry(state.log, `${u.card.name} становится сильнее!`);
                }
            });
            // Leader abilities on death
            if(!isOpponentLeaderSatyr){
                if(p.leader.card.id === 20) { // Phoenix Leader
                    const enemyLeader = state.players[getOtherPlayerId(p.id)]!.leader;
                    enemyLeader.currentHealth -= 1;
                    state.log = addLogEntry(state.log, `Лидер ${p.name} наносит 1 урон вражескому лидеру!`);
                }
                if(p.leader.card.id === 37 && p.hand.length < 10 && p.deck.length > 0) {
                    p.hand.push(p.deck.shift()!);
                    state.log = addLogEntry(state.log, `${p.name} берет карту.`);
                }
            }
        }
        
        if (victim.id.startsWith('leader-')) {
            const winner = getOtherPlayerId(victim.owner);
            state.game.winner = winner;
            state.game.phase = GamePhase.GAME_OVER;
            state.log = addLogEntry(state.log, `Игра окончена! ${state.players[winner]!.name} побеждает!`);
            return state;
        }

        const owner = state.players[victim.owner]!;
        owner.deadUnits.push(victim.originalCardOnTransform || victim.card);
        owner.units = owner.units.filter(u => u.id !== victim.id);

        // --- DEATHRATTLES ---
        let deathrattleTriggered = 1;
        if(owner.leader.card.id === 36) deathrattleTriggered = 2;

        for(let i=0; i < deathrattleTriggered; i++){
            switch (victim.card.id) {
                case 10: // Necromancer (Vanguard)
                    if (owner.units.length < 9) {
                        const skeleton = createUnitFromCard(SKELETON_TOKEN, victim.owner, victim.position);
                        skeleton.canAttack = true; owner.units.push(skeleton);
                    }
                    break;
                case 20: // Phoenix
                    if (victim.position.wave === Wave.Vanguard) { // AoE damage
                        const damage = 3 + (state.game.globalEffects[owner.id]?.abilityDamageBonus || 0);
                        state.log = addLogEntry(state.log, `Предсмертный хрип Феникса наносит ${damage} урона всем!`);
                        Object.values(state.players).forEach(p => {
                            if (!p) return;
                            p.units.forEach(u => u.currentHealth -= damage);
                            p.leader.currentHealth -= damage;
                        });
                    }
                    if (victim.position.wave === Wave.Flank) { // Rebirth
                        const rebornPhoenix: Unit = { ...victim, isRebirthingFor: 2, currentHealth: 1, originalCardOnDeath: victim.card };
                        owner.units.push(rebornPhoenix);
                        state.log = addLogEntry(state.log, `${victim.card.name} превращается в пепел!`);
                    }
                    break;
                case 36: // Bombardier (Vanguard)
                case 1013: // Bomb Trap
                    {
                        const isTrap = victim.card.id === 1013;
                        const damage = (isTrap ? 5 : 3) + (state.game.globalEffects[owner.id]?.abilityDamageBonus || 0);
                        state.log = addLogEntry(state.log, `${victim.card.name} взрывается, нанося ${damage} урона всем вокруг!`);
                        const allUnitsAndLeaders = [...state.players.Player1!.units, ...state.players.Player2!.units, state.players.Player1!.leader, state.players.Player2!.leader];
                        const adjacentUnits = allUnitsAndLeaders.filter(u => 
                            u.id !== victim.id &&
                            Math.abs(WAVE_ORDER.indexOf(u.position.wave) - WAVE_ORDER.indexOf(victim.position.wave)) <= 1 &&
                            Math.abs(u.position.col - victim.position.col) <= 1
                        );
                        adjacentUnits.forEach(t => t.currentHealth -= damage);
                    }
                    break;
            }
        }
    }

    const newDead = findDeadUnitsAndLeaders(state.players).filter(u => !processedDeaths.has(u.id));
    if (newDead.length > 0) {
        return resolveDeaths(state);
    }
    return state;
}

// --- MAIN REDUCER ---

export const gameReducer = (state: FullGameState, action: GameAction): FullGameState => {
  const { game, players, log } = state;
  if (game.phase === GamePhase.GAME_OVER && action.type !== 'REQUEST_RESTART' && action.type !== 'SET_FULL_STATE') return state;

  const currentPlayerId = game.currentPlayer;
  const opponentPlayerId = getOtherPlayerId(currentPlayerId);
  
  switch (action.type) {
    case 'SET_FULL_STATE':
      return action.payload;

    case 'SETUP_GAME': {
      const { deck } = action.payload;
      let initial = createInitialState();
      const shuffled = shuffleDeck([...deck]);
      
      const p1LeaderCard = shuffled.shift()!;
      const p2LeaderCard = shuffled.shift()!;

      const p1Deck = shuffled.slice(0, 24);
      const p2Deck = shuffled.slice(24);

      const p1Hand = p1Deck.splice(0, HAND_SIZE);
      const p2Hand = p2Deck.splice(0, HAND_SIZE);

      const player1 = createInitialPlayer(PlayerID.Player1, PLAYER1_NAME, p1LeaderCard, p1Deck, p1Hand);
      const player2 = createInitialPlayer(PlayerID.Player2, PLAYER2_NAME, p2LeaderCard, p2Deck, p2Hand);
      
      initial.players = { Player1: player1, Player2: player2 };
      
      // --- LEADER ABILITIES ---
      const applyLeaderAbilities = (p: Player, o: Player) => {
          if (o.leader.card.id === 24) return; // Satyr leader disables opponent's leader ability
          switch(p.leader.card.id) {
              case 1: [...p.units, p.leader].forEach(u => { u.maxHealth += 2; u.currentHealth += 2; }); break;
              case 9: [...p.units, p.leader].forEach(u => applyEffect(u, { type: 'DIVINE_SHIELD', duration: -1 })); break;
              case 11: 
                  for(let i=0; i < 2; i++) {
                     const slot = findEmptySlot(p, Wave.Vanguard);
                     if(slot) p.units.push(createUnitFromCard(GOBLIN_TOKEN, p.id, slot));
                  }
                  break;
              case 13: p.leader.maxHealth += 10; p.leader.currentHealth += 10; break;
              case 17: if(p.deck.length > 0) p.hand.push(p.deck.shift()!); break;
              case 19: [...p.units, p.leader].forEach(u => applyEffect(u, {type: 'REGENERATION', value: 1, duration: -1})); break;
              case 22: [...p.units, p.leader].forEach(u => {u.maxHealth -=1; u.currentHealth -=1;}); break;
              case 25: [...p.units, p.leader].forEach(u => {u.maxHealth +=3; u.currentHealth +=3;}); break;
              case 26: initial.game.globalEffects[p.id] = {...initial.game.globalEffects[p.id], missChance: 15 }; break;
              case 31: p.units.filter(u => u.card.tribe === 'Тролль').forEach(u => applyEffect(u, {type: 'REGENERATION', value: 2, duration: -1})); break;
              case 32: initial.game.globalEffects[o.id] = {...initial.game.globalEffects[o.id], missChance: 25 }; break;
              case 35: 
                  for(let i=0; i < 2; i++) {
                     const slot = findEmptySlot(p, Wave.Vanguard);
                     if(slot) p.units.push(createUnitFromCard(SPIDER_TOKEN, p.id, slot));
                  }
                  break;
              case 42: [...p.units, p.leader].forEach(u => applyEffect(u, {type: 'LIFESTEAL', duration: -1})); break;
              case 44: initial.game.globalEffects[o.id] = {...initial.game.globalEffects[o.id], missChance: 25 }; break;
              case 45: initial.game.globalEffects[o.id] = {...initial.game.globalEffects[o.id], cannotSummonTribes: ['Демон', 'Нежить'] }; break;
              case 46: p.actions = 3; break;
              case 50: applyEffect(p.leader, {type: 'LIFESTEAL', duration: -1}); p.leader.maxHealth +=5; p.leader.currentHealth +=5; break;
          }
      };
      
      applyLeaderAbilities(player1, player2);
      applyLeaderAbilities(player2, player1);
      
      const firstPlayerId = (player1.leader.card.id === 28) ? PlayerID.Player1 : (player2.leader.card.id === 28) ? PlayerID.Player2 : PlayerID.Player1;

      initial.game = { ...initial.game, phase: GamePhase.PLAYER_1_TURN, currentPlayer: firstPlayerId };
      initial.log = addLogEntry(initial.log, `Игра началась! Ход игрока ${initial.players[firstPlayerId]!.name}.`);
      return initial;
    }
    
    case 'SELECT_CARD': {
        const { playerId, card } = action.payload;
        const currentPlayer = players[currentPlayerId];
        if (currentPlayerId !== playerId || !currentPlayer || currentPlayer.actions <= 0) return state;
        return { ...state, selectedCard: { player: playerId, card }, selectedUnit: null };
    }
    
    case 'SELECT_UNIT': {
        const { unit } = action.payload;
        if (currentPlayerId !== unit.owner) return state;
        const maxAttacks = hasEffect(unit, 'WINDFURY') ? 2 : 1;
        if (!unit.canAttack || unit.attacksThisTurn >= maxAttacks || hasEffect(unit, 'FROZEN') || hasEffect(unit, 'STUN') || hasEffect(unit, 'PETRIFIED')) {
            return { ...state, log: addLogEntry(log, `${unit.card.name} не может действовать.`) };
        }
        return { ...state, selectedUnit: unit, selectedCard: null };
    }
    
    case 'PLAY_CARD': {
        const currentPlayer = players[currentPlayerId]!;
        const { position } = action.payload;
        if (!state.selectedCard || state.selectedCard.player !== currentPlayerId || !currentPlayer || currentPlayer.actions <= 0) return state;
        const maxUnits = currentPlayer.leader.card.id === 41 ? 10 : 9;
        if (currentPlayer.units.length >= maxUnits) return {...state, log: addLogEntry(log, `На поле не может быть больше ${maxUnits} юнитов.`)};
        if(state.game.globalEffects[currentPlayerId]?.cannotSummonTribes?.includes(state.selectedCard.card.tribe || '')) return {...state, log: addLogEntry(log, `Нельзя призывать этого юнита.`)}

        let newState = cloneState(state);
        let newLog = [...log];
        const newUnit = createUnitFromCard(state.selectedCard.card, currentPlayerId, position);
        if (currentPlayer.leader.card.id === 48 && getUnitTotalAttack(newUnit, newState) >= 6) newUnit.canAttack = true;

        const updatedPlayer = newState.players[currentPlayerId]!;
        updatedPlayer.units.push(newUnit);
        updatedPlayer.hand = updatedPlayer.hand.filter(c => c.id !== state.selectedCard!.card.id);
        updatedPlayer.actions -= 1;
        newLog = addLogEntry(newLog, `${currentPlayer.name} разыграл ${newUnit.card.name} в ряду: ${position.wave}.`);

        // --- ON PLAY ABILITIES ---
        const getUnitInFront = (player: Player, col: number) => player.units.find(u => u.position.col === col && u.position.wave !== Wave.Rear);
        const opponent = newState.players[opponentPlayerId]!;
        
        const abilityDamageBonus = newState.game.globalEffects[currentPlayerId]?.abilityDamageBonus || 0;

        switch(newUnit.card.id) {
            case 1: if (position.wave === Wave.Rear) { const t = getUnitInFront(updatedPlayer, position.col); if(t) {t.maxHealth+=2; t.currentHealth+=2;} } break;
            case 2: if(position.wave === Wave.Rear) { const t = [...opponent.units, opponent.leader].find(u => u.currentHealth <= 3); if(t) t.currentHealth=0; } break;
            case 4: 
                 if (position.wave === Wave.Flank) { const t = updatedPlayer.units.sort((a,b) => (a.maxHealth - a.currentHealth) - (b.maxHealth - b.currentHealth)).pop(); if (t) t.currentHealth = Math.min(t.maxHealth, t.currentHealth + 4); }
                 else if (position.wave === Wave.Rear && updatedPlayer.deadUnits.length > 0 && updatedPlayer.units.length < maxUnits) { const c = updatedPlayer.deadUnits.pop()!; const s = findEmptySlot(updatedPlayer, Wave.Vanguard); if(s) { const u = createUnitFromCard(c, updatedPlayer.id, s); u.currentHealth = 1; updatedPlayer.units.push(u); newLog = addLogEntry(newLog, `${newUnit.card.name} воскрешает ${u.card.name}!`); }}
                 break;
            case 5: if(position.wave === Wave.Rear) [...opponent.units, opponent.leader].forEach(u => u.currentHealth -= (1 + abilityDamageBonus)); break;
            case 6:
                if (position.wave === Wave.Vanguard && updatedPlayer.units.length < maxUnits) { const s = findEmptySlot(updatedPlayer, Wave.Vanguard, position.col); if(s) { const t = createUnitFromCard(TURRET_TOKEN, currentPlayerId, s); t.canAttack = true; updatedPlayer.units.push(t); }}
                else if (position.wave === Wave.Flank) { const t = getUnitInFront(updatedPlayer, position.col); if(t) applyEffect(t, { type: 'ATTACK_BUFF', value: 2, duration: -1}); }
                else if (position.wave === Wave.Rear) updatedPlayer.leader.currentHealth = Math.min(updatedPlayer.leader.maxHealth, updatedPlayer.leader.currentHealth + 5);
                break;
            case 7:
                 if(position.wave === Wave.Flank) { 
                    const t = opponent.units[Math.floor(Math.random() * opponent.units.length)]; 
                    if(t) {
                        applyEffect(t, { type: 'FROZEN', duration: 2}); 
                        newLog = addLogEntry(newLog, `${newUnit.card.name} замораживает ${t.card.name}!`);
                    }
                 } else if (position.wave === Wave.Rear) { 
                    const row = opponent.units.filter(u => u.position.wave === Wave.Vanguard); 
                    (row.length ? row : opponent.units).forEach(u => applyEffect(u, { type: 'FROZEN', duration: 2})); 
                    newLog = addLogEntry(newLog, `${newUnit.card.name} замораживает вражеский ряд!`);
                 }
                 break;
            case 8:
                if(position.wave === Wave.Flank) { 
                    const t = opponent.units[Math.floor(Math.random() * opponent.units.length)]; 
                    if(t) {
                        applyEffect(t, { type: 'POISON', value: 1, duration: 3}); 
                        newLog = addLogEntry(newLog, `${t.card.name} отравлен!`);
                    }
                }
                else if (position.wave === Wave.Rear) opponent.units.filter(u => u.position.col === position.col).forEach(u => u.currentHealth -= (3 + abilityDamageBonus));
                break;
            case 9:
                if (position.wave === Wave.Flank) { const t = getUnitInFront(updatedPlayer, position.col); if(t) applyEffect(t, { type: 'DIVINE_SHIELD', duration: -1}); }
                else if (position.wave === Wave.Rear) { 
                    const targets = updatedPlayer.units.filter(u => u.currentHealth < u.maxHealth).sort((a,b) => (a.maxHealth - a.currentHealth) - (b.maxHealth - b.currentHealth)); 
                    const target = targets.length > 0 ? targets[targets.length - 1] : null;
                    if(target) {
                        target.currentHealth = target.maxHealth;
                        newLog = addLogEntry(newLog, `${newUnit.card.name} полностью излечивает ${target.card.name}!`);
                    }
                }
                break;
            case 10:
                for (let i=0; i < (position.wave === Wave.Rear ? 2:1); i++) if(updatedPlayer.units.length < maxUnits) {const s = findEmptySlot(updatedPlayer, Wave.Vanguard); if(s) updatedPlayer.units.push(createUnitFromCard(SKELETON_TOKEN, currentPlayerId, s));}
                break;
            case 11:
                if(position.wave === Wave.Flank) {
                    updatedPlayer.units.filter(u => u.card.tribe === 'Гоблин' || u.id === newUnit.id).forEach(u => {
                        applyEffect(u, {type: 'ATTACK_BUFF', value: 1, duration: -1});
                        u.maxHealth += 1;
                        u.currentHealth += 1;
                    });
                    newLog = addLogEntry(newLog, `Гоблины воодушевлены Королем!`);
                }
                if(position.wave === Wave.Rear) for(let i=0; i < 3; i++) if(updatedPlayer.units.length < maxUnits) {const s = findEmptySlot(updatedPlayer, WAVE_ORDER[i]); if(s) updatedPlayer.units.push(createUnitFromCard(GOBLIN_TOKEN, currentPlayerId, s));}
                break;
            case 12: if(position.wave === Wave.Rear) updatedPlayer.units.forEach(u => {if(u.id !== newUnit.id) applyEffect(u, {type: 'ATTACK_BUFF', value: 2, duration: 2})}); break;
            case 14:
                if (position.wave === Wave.Flank) { const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) applyEffect(t, {type:'ATTACK_BUFF', value:-2, duration:-1}); }
                else if (position.wave === Wave.Rear) { const t = opponent.units.find(u => getUnitTotalAttack(u, newState) <= 3); if (t && updatedPlayer.units.length < maxUnits) { opponent.units = opponent.units.filter(u => u.id !== t.id); t.owner = updatedPlayer.id; updatedPlayer.units.push(t); }}
                break;
            case 15:
                if(position.wave === Wave.Flank) { const t = updatedPlayer.units[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) [newUnit.position, t.position] = [t.position, newUnit.position]; }
                if(position.wave === Wave.Rear) { newState.game.globalEffects[opponentPlayerId] = {...newState.game.globalEffects[opponentPlayerId], isHandVisible: true }; }
                break;
            case 17:
                if(position.wave === Wave.Vanguard) {
                    [...updatedPlayer.units, updatedPlayer.leader].filter(u => 
                        u.id !== newUnit.id &&
                        u.position.wave === newUnit.position.wave && 
                        (u.position.col === position.col - 1 || u.position.col === position.col + 1)
                    ).forEach(u => {
                        u.maxHealth += 2; 
                        u.currentHealth += 2;
                        newLog = addLogEntry(newLog, `${u.card.name} получает +2 к здоровью от ${newUnit.card.name}.`);
                    });
                }
                if(position.wave === Wave.Flank) { 
                    const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; 
                    if(t) {
                        applyEffect(t, {type:'STUN', duration:2}); 
                        newLog = addLogEntry(newLog, `${t.card.name} усыплен!`);
                    }
                }
                if(position.wave === Wave.Rear) {
                    const targetToCopy = updatedPlayer.units.filter(u => u.id !== newUnit.id)[Math.floor(Math.random() * (updatedPlayer.units.length -1))];
                    const emptySlot = findEmptySlot(updatedPlayer);
                    if(targetToCopy && emptySlot && updatedPlayer.units.length < maxUnits) {
                        const copy = createUnitFromCard(targetToCopy.card, updatedPlayer.id, emptySlot);
                        copy.currentHealth = 1;
                        updatedPlayer.units.push(copy);
                        newLog = addLogEntry(newLog, `${newUnit.card.name} создает копию ${copy.card.name}!`);
                    }
                }
                break;
            case 18: if(position.wave === Wave.Rear) { const s = findEmptySlot(opponent); if(s) newState.game.globalEffects.brokenCells = [...(newState.game.globalEffects.brokenCells || []), {position: s, turnsLeft: 2}];} break;
            case 22: if(position.wave === Wave.Flank) { const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) t.currentHealth -= (5 + abilityDamageBonus); } break;
            case 23:
                if (position.wave === Wave.Rear) newState.game.globalEffects[opponentPlayerId] = { ...newState.game.globalEffects[opponentPlayerId], noCardsNextTurn: true };
                break;
            case 24:
                if (position.wave === Wave.Flank && opponent.units.length >= 2) {
                    const attackerIndex = Math.floor(Math.random() * opponent.units.length);
                    const attacker = opponent.units[attackerIndex];
                    const otherUnits = opponent.units.filter((_, idx) => idx !== attackerIndex);
                    const target = otherUnits[Math.floor(Math.random() * otherUnits.length)];
                    if(attacker && target) {
                        const damage = getUnitTotalAttack(attacker, newState);
                        target.currentHealth -= damage;
                        newLog = addLogEntry(newLog, `${newUnit.card.name} заставляет ${attacker.card.name} атаковать ${target.card.name} на ${damage} урона!`);
                    }
                }
                if (position.wave === Wave.Rear) { const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) { t.effects.forEach(e => newUnit.effects.push(e)); }}
                break;
            case 25:
                if (position.wave === Wave.Flank) { const t = getUnitInFront(updatedPlayer, position.col); if(t) {t.maxHealth+=4; t.currentHealth+=4;} }
                else if (position.wave === Wave.Rear && updatedPlayer.units.length < maxUnits) { const s = findEmptySlot(updatedPlayer, Wave.Vanguard); if(s) updatedPlayer.units.push(createUnitFromCard(STONE_WALL_TOKEN, currentPlayerId, s)); }
                break;
            case 26:
                if(position.wave === Wave.Flank) { const t = updatedPlayer.units.filter(u=>u.id !== newUnit.id)[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) {const s=findEmptySlot(updatedPlayer); if(s) t.position=s;}}
                if(position.wave === Wave.Rear) {
                    opponent.units.forEach(u => {
                        const waveIdx = WAVE_ORDER.indexOf(u.position.wave);
                        if (waveIdx < 2) { 
                            u.position.wave = WAVE_ORDER[waveIdx + 1];
                        }
                    });
                    newLog = addLogEntry(newLog, `${newUnit.card.name} отталкивает всех врагов назад!`);
                }
                break;
            case 27: if(position.wave === Wave.Rear) opponent.leader.currentHealth -= (3 + abilityDamageBonus); break;
            case 28:
                 if(position.wave === Wave.Flank) { const c1 = updatedPlayer.deck.shift(); const c2 = updatedPlayer.deck.shift(); const c3 = updatedPlayer.deck.shift(); /* UI part needed */ if(c1) updatedPlayer.hand.push(c1); if(c2)updatedPlayer.deck.unshift(c2); if(c3)updatedPlayer.deck.unshift(c3); }
                 if(position.wave === Wave.Rear) newState.game.globalEffects[opponentPlayerId] = { ...newState.game.globalEffects[opponentPlayerId], isHandVisible: true };
                 break;
            case 29: if(position.wave === Wave.Rear) updatedPlayer.units.forEach(u => applyEffect(u, {type:'ATTACK_BUFF', value: 1, duration: 2})); break;
            case 30:
                 if(position.wave === Wave.Flank) { const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) applyEffect(t, {type:'ATTACK_BUFF', value:-2, duration:-1});}
                 if(position.wave === Wave.Rear) { const t = updatedPlayer.units[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) applyEffect(t, {type:'ATTACK_BUFF', value:3, duration:-1});}
                 break;
            case 31: if(position.wave === Wave.Rear) { updatedPlayer.leader.currentHealth += 10; newUnit.currentHealth = 0; } break;
            case 32:
                 if(position.wave === Wave.Flank) {
                    const target = opponent.units[Math.floor(Math.random() * opponent.units.length)];
                    const emptySlotOnOpponentSide = findEmptySlot(opponent, target?.position.wave, target?.position.col);
                    if(target && emptySlotOnOpponentSide) {
                        target.position = emptySlotOnOpponentSide;
                        newLog = addLogEntry(newLog, `${newUnit.card.name} перемещает ${target.card.name} в случайное место!`);
                    }
                 }
                 if(position.wave === Wave.Rear) for(let i=0; i<2; i++) if(updatedPlayer.units.length < maxUnits) {const s = findEmptySlot(updatedPlayer); if(s) updatedPlayer.units.push(createUnitFromCard(ILLUSION_TOKEN, updatedPlayer.id, s));}
                 break;
            case 33:
                 if(position.wave === Wave.Flank) {const t=opponent.units.find(u=>u.position.wave === Wave.Rear); if(t) t.position.wave=Wave.Vanguard;}
                 if(position.wave === Wave.Rear) newState.game.globalEffects.fieldEffect = 'SWAMP';
                 break;
            case 34: if(position.wave === Wave.Rear) applyEffect(newUnit, {type: 'PREPARING_ATTACK', duration: 2}); break;
            case 35: if(position.wave === Wave.Flank) {
                const t=opponent.units[Math.floor(Math.random()*opponent.units.length)]; 
                if(t) {
                    applyEffect(t, {type: 'FROZEN', duration: 2});
                    newLog = addLogEntry(newLog, `${t.card.name} опутан паутиной!`);
                }
            } break;
            case 36:
                if (position.wave === Wave.Flank) {
                    if (opponent.units.length > 0) {
                        const targetUnit = opponent.units[Math.floor(Math.random() * opponent.units.length)];
                        const damage = 3 + abilityDamageBonus;
                        const affectedUnits = [...opponent.units, opponent.leader].filter(u => Math.abs(WAVE_ORDER.indexOf(u.position.wave) - WAVE_ORDER.indexOf(targetUnit.position.wave)) <= 1 && Math.abs(u.position.col - targetUnit.position.col) <= 1);
                        affectedUnits.forEach(t => t.currentHealth -= damage);
                    }
                } else if (position.wave === Wave.Rear && updatedPlayer.units.length < maxUnits) { const s = findEmptySlot(updatedPlayer); if (s) updatedPlayer.units.push(createUnitFromCard(BOMB_TRAP_TOKEN, updatedPlayer.id, s)); }
                break;
            case 37:
                 if(position.wave === Wave.Flank) { const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) { t.currentHealth -= 2; newUnit.currentHealth += 2; } }
                 if(position.wave === Wave.Rear) { const t = updatedPlayer.units.filter(u=>u.id !== newUnit.id)[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) { t.currentHealth = 0; if(updatedPlayer.deck.length>0)updatedPlayer.hand.push(updatedPlayer.deck.shift()!); if(updatedPlayer.deck.length>0)updatedPlayer.hand.push(updatedPlayer.deck.shift()!); } }
                 break;
            case 38: if (position.wave === Wave.Rear) { const t = opponent.units.length > 0 ? opponent.units[0] : opponent.leader; t.currentHealth -= (6 + abilityDamageBonus); } break;
            case 39:
                 if(position.wave === Wave.Vanguard) [...updatedPlayer.units, ...opponent.units, updatedPlayer.leader, opponent.leader].forEach(u => u.currentHealth -= (1+abilityDamageBonus));
                 if(position.wave === Wave.Flank) {const t = updatedPlayer.units.filter(u=>u.id !== newUnit.id)[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) { const e = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(e) {e.currentHealth -= getUnitTotalAttack(t,newState); t.currentHealth=0;}}}
                 break;
            case 40:
                if(position.wave === Wave.Flank) { 
                    const row = opponent.units.filter(u=>u.position.wave === Wave.Vanguard); 
                    (row.length ? row : opponent.units).forEach(u=>applyEffect(u, {type:'FROZEN', duration: 2}));
                    newLog = addLogEntry(newLog, `Враги опутаны корнями!`);
                }
                if (position.wave === Wave.Rear && updatedPlayer.units.length < maxUnits-1) { for(let i=0; i<2; i++){const s=findEmptySlot(updatedPlayer, Wave.Vanguard); if(s) updatedPlayer.units.push(createUnitFromCard(WOLF_TOKEN, currentPlayerId, s));}}
                break;
            case 41:
                if (position.wave === Wave.Flank && updatedPlayer.units.length < maxUnits) { const s = findEmptySlot(updatedPlayer, Wave.Vanguard); if(s) updatedPlayer.units.push(createUnitFromCard(LEGIONNAIRE_TOKEN, currentPlayerId, s)); }
                else if (position.wave === Wave.Rear) updatedPlayer.units.forEach(u => { if (u.id !== newUnit.id) applyEffect(u, { type: 'ATTACK_BUFF', value: 1, duration: -1 }); });
                break;
            case 42: if(position.wave === Wave.Rear) {const t=updatedPlayer.units.filter(u=>u.id !== newUnit.id)[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) applyEffect(t, {type:'LIFESTEAL', duration:2});} break;
            case 43:
                 if(position.wave === Wave.Flank) { 
                    const target = updatedPlayer.units.filter(u => u.id !== newUnit.id)[Math.floor(Math.random() * (updatedPlayer.units.length - 1))];
                    const ogreCard = staticDeck.find(c => c.id === 5) || { ...SKELETON_TOKEN, name: 'Огр', attack: 8, health: 8, id: 5 };
                    if(target) { 
                        target.originalCardOnTransform = target.card;
                        applyEffect(target, {type: 'TRANSFORMED', duration: 2, payload: { card: ogreCard }});
                        target.card = ogreCard;
                        target.maxHealth = ogreCard.health;
                        target.currentHealth = Math.min(target.currentHealth, target.maxHealth);
                        newLog = addLogEntry(newLog, `${target.originalCardOnTransform.name} превращается в Огра!`);
                    }
                 }
                 if(position.wave === Wave.Rear) { if(Math.random()>0.5){const t=updatedPlayer.units[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t)t.currentHealth+=5;} else {const t=opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t)t.currentHealth-=3;} }
                 break;
            case 44: if(position.wave === Wave.Flank) { 
                const t=opponent.units[Math.floor(Math.random()*opponent.units.length)]; 
                if(t) {
                    applyEffect(t, {type:'FROZEN', duration:2}); 
                    newLog = addLogEntry(newLog, `${t.card.name} напуган!`);
                }
            } break;
            case 45:
                 if(position.wave === Wave.Flank) newState.game.globalEffects[opponentPlayerId] = {...newState.game.globalEffects[opponentPlayerId], cardCostIncrease: 1};
                 if(position.wave === Wave.Rear) { 
                     const target = opponent.units[Math.floor(Math.random() * opponent.units.length)];
                     if(target) {
                         opponent.units = opponent.units.filter(u => u.id !== target.id);
                         target.isRebirthingFor = 2; // Set duration for return (1 opponent turn)
                         opponent.banishedUnits.push(target);
                         newLog = addLogEntry(newLog, `${target.card.name} изгнан с поля на 1 ход!`);
                     }
                 }
                 break;
            case 46:
                 if(position.wave === Wave.Flank) {const t=updatedPlayer.units.find(u=>u.id!==newUnit.id && u.canAttack && u.attacksThisTurn < 1); if(t) t.attacksThisTurn = -1; } // Will attack twice
                 if(position.wave === Wave.Rear) updatedPlayer.actions += 1;
                 break;
            case 47:
                 if(position.wave === Wave.Flank) {
                     updatedPlayer.actions += 1;
                     newLog = addLogEntry(newLog, `${newUnit.card.name} дарует дополнительное очко действия!`);
                 }
                 if(position.wave === Wave.Rear) newState.game.globalEffects[opponentPlayerId] = {...newState.game.globalEffects[opponentPlayerId], cardCostIncrease: 99 };
                 break;
            case 48:
                 if(position.wave === Wave.Vanguard) {const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) t.currentHealth -= getUnitTotalAttack(newUnit, newState);}
                 if(position.wave === Wave.Rear) {const t = opponent.units[Math.floor(Math.random()*opponent.units.length)]; if(t) t.effects = [];}
                 break;
            case 49:
                 if(position.wave === Wave.Flank) { const t = updatedPlayer.units[Math.floor(Math.random()*updatedPlayer.units.length)]; if(t) applyEffect(t, {type:'IMMUNE_TO_ABILITIES', duration: 2});}
                 // Rear ability needs initial positions stored, complex.
                 break;
            case 50:
                 if(position.wave === Wave.Flank) { const row = opponent.units.filter(u=>u.position.wave === Wave.Vanguard); (row.length ? row : opponent.units).forEach(u => {u.currentHealth-=2; newUnit.currentHealth+=2;}); }
                 if(position.wave === Wave.Rear && updatedPlayer.deadUnits.length > 0 && updatedPlayer.units.length < maxUnits-1) {
                     for(let i=0; i<2; i++) { const c = updatedPlayer.deadUnits.pop(); if(c){ const s = findEmptySlot(updatedPlayer); if(s) updatedPlayer.units.push(createUnitFromCard(c,updatedPlayer.id,s));}}
                 }
                 break;
        }

        newState.log = newLog;
        newState.selectedCard = null;

        return resolveDeaths(newState);
    }

    case 'ATTACK': {
        const { target } = action.payload;
        const attacker = state.selectedUnit;

        // --- STAGE 1: VALIDATION ---
        // Perform all checks on the original, unmodified state.
        const currentPlayer = state.players[currentPlayerId];
        const opponentPlayer = state.players[opponentPlayerId];

        if (!attacker || !currentPlayer || !opponentPlayer || attacker.owner !== currentPlayerId) {
            return state; // Should not happen with a proper UI
        }

        if (currentPlayer.actions <= 0) {
            return { ...state, selectedUnit: null, log: addLogEntry(state.log, `Недостаточно очков действия для атаки!`) };
        }

        const maxAttacks = hasEffect(attacker, 'WINDFURY') ? 2 : 1;
        if (!attacker.canAttack || attacker.attacksThisTurn >= maxAttacks || hasEffect(attacker, 'STUN') || hasEffect(attacker, 'FROZEN') || hasEffect(attacker, 'PETRIFIED')) {
            return { ...state, selectedUnit: null, log: addLogEntry(state.log, `${attacker.card.name} не может атаковать в данный момент!`) };
        }

        if (!hasEffect(attacker, 'IGNORE_VANGUARD') && !hasEffect(attacker, 'IGNORE_STEALTH')) {
            const provokingUnits = opponentPlayer.units.filter(u => hasEffect(u, 'PROVOKE'));
            if (provokingUnits.length > 0 && !provokingUnits.some(u => u.id === target.id)) {
                return { ...state, selectedUnit: null, log: addLogEntry(state.log, `Вы должны атаковать юнита с Провокацией!`) };
            }
            if (hasEffect(target, 'STEALTH') && opponentPlayer.units.some(u => u.id !== target.id && !u.id.startsWith('leader-'))) {
                return { ...state, selectedUnit: null, log: addLogEntry(state.log, `Нельзя атаковать юнита в скрытности, пока есть другие цели.`) };
            }
            const vanguardUnits = opponentPlayer.units.filter(u => u.position.wave === Wave.Vanguard && !hasEffect(u, 'STEALTH'));
            if (vanguardUnits.length > 0 && !vanguardUnits.some(u => u.id === target.id)) {
                return { ...state, selectedUnit: null, log: addLogEntry(state.log, `Вы должны сначала атаковать юнитов в Авангарде!`) };
            }
        }
        
        // --- STAGE 2: EXECUTION ---
        // All validations passed. Create a new state and IMMEDIATELY pay the costs.
        let newState = cloneState(state);
        
        const actingPlayer = newState.players[currentPlayerId]!;
        const opponent = newState.players[opponentPlayerId]!;
        const attackerRef = [...actingPlayer.units, actingPlayer.leader].find(u => u.id === attacker.id)!;
        const targetRef = [...opponent.units, opponent.leader].find(u => u.id === target.id)!;
        
        // ** THE CRITICAL STEP: Pay cost before any other logic **
        actingPlayer.actions -= 1;
        attackerRef.attacksThisTurn += 1;
        newState.log = addLogEntry(newState.log, `${attackerRef.card.name} атакует ${targetRef.card.name}!`);

        // --- STAGE 3: COMBAT RESOLUTION ---
        const abilityDamageBonus = newState.game.globalEffects[currentPlayerId]?.abilityDamageBonus || 0;
        const maxUnits = actingPlayer.leader.card.id === 41 ? 10 : 9;

        if (newState.game.globalEffects[target.owner]?.missChance && Math.random() * 100 < newState.game.globalEffects[target.owner]!.missChance!) {
            newState.log = addLogEntry(newState.log, `${attackerRef.card.name} промахивается по ${targetRef.card.name}!`);
            newState.selectedUnit = null;
            return newState;
        }

        if (attackerRef.card.id === 46 && attackerRef.position.wave === Wave.Vanguard) {
            actingPlayer.units.filter(u => u.id !== attackerRef.id && u.canAttack && u.attacksThisTurn < 1).forEach(u => u.attacksThisTurn = -1);
        }

        if (attacker.card.id === 15 && attacker.position.wave === Wave.Vanguard && target.id.startsWith('leader-')) { if (opponent.hand.length > 0 && actingPlayer.hand.length < 10) actingPlayer.hand.push(opponent.hand.pop()!); }
        if (attacker.card.id === 18 && attacker.position.wave === Wave.Flank) {
            applyEffect(targetRef, { type: 'STUN', duration: 2 });
            newState.log = addLogEntry(newState.log, `${targetRef.card.name} оглушен!`);
        }
        if (attacker.card.id === 23 && attacker.position.wave === Wave.Vanguard && !target.id.startsWith('leader-')) {
            const targetOwner = newState.players[targetRef.owner]!;
            targetOwner.units = targetOwner.units.filter(u => u.id !== targetRef.id);
            if (targetOwner.hand.length < 10) targetOwner.hand.push(targetRef.card); else targetOwner.discard.push(targetRef.card);
            newState.log = addLogEntry(newState.log, `${attackerRef.card.name} возвращает ${targetRef.card.name} в руку!`);
            newState.selectedUnit = null;
            return resolveDeaths(newState);
        }

        let damage = getUnitTotalAttack(attackerRef, newState);
        let allTargets: Unit[] = [targetRef];

        if (attacker.card.id === 1 && attacker.position.wave === Wave.Flank) allTargets = opponent.units.filter(u => u.position.wave === target.position.wave);
        if (attacker.card.id === 5 && attacker.position.wave === Wave.Flank) allTargets = opponent.units.filter(u => u.position.wave === target.position.wave);
        if (attacker.card.id === 12 && attacker.position.wave === Wave.Flank) {
            allTargets.push(...opponent.units.filter(u => u.position.wave === target.position.wave && Math.abs(u.position.col - target.position.col) === 1));
            damage = 4 + abilityDamageBonus;
        }
        if (attacker.card.id === 19 && attacker.position.wave === Wave.Flank) allTargets = opponent.units.filter(u => u.position.wave === Wave.Vanguard);
        if (attacker.card.id === 34 && attacker.position.wave === Wave.Flank) allTargets.push(...opponent.units.filter(u => Math.abs(WAVE_ORDER.indexOf(u.position.wave) - WAVE_ORDER.indexOf(target.position.wave)) <= 1 && Math.abs(u.position.col - target.position.col) <= 1));

        allTargets.forEach(currentTarget => {
            const currentTargetRef = [...opponent.units, opponent.leader].find(u => u.id === currentTarget.id);
            if (!currentTargetRef) return;

            let currentDamage = (currentTargetRef.id === targetRef.id || attacker.card.id !== 12) ? damage : 2 + abilityDamageBonus;
            const attackerHasFirstStrike = hasEffect(attackerRef, 'FIRST_STRIKE');
            const canCounterAttack = !attackerHasFirstStrike || hasEffect(currentTargetRef, 'FIRST_STRIKE');

            if (hasEffect(currentTargetRef, 'DODGE') && Math.random() * 100 < getEffectValue(currentTargetRef, 'DODGE')) { newState.log = addLogEntry(newState.log, `${currentTargetRef.card.name} уклоняется!`); return; }
            if (hasEffect(currentTargetRef, 'DIVINE_SHIELD')) { removeEffect(currentTargetRef, 'DIVINE_SHIELD'); newState.log = addLogEntry(newState.log, `${currentTargetRef.card.name} теряет Божественный щит!`); currentDamage = 0; }
            
            const armor = getUnitTotalArmor(currentTargetRef);
            const damageDealt = Math.max(0, currentDamage - armor);
            const originalHealth = currentTargetRef.currentHealth;
            currentTargetRef.currentHealth -= damageDealt;
            newState.log = addLogEntry(newState.log, `${currentTargetRef.card.name} получает ${damageDealt} урона.`);
            
            if (hasEffect(attackerRef, 'LIFESTEAL')) attackerRef.currentHealth = Math.min(attackerRef.maxHealth, attackerRef.currentHealth + damageDealt);
            if (hasEffect(attackerRef, 'TRAMPLE') && currentTargetRef.currentHealth <= 0) {
                const excessDamage = damageDealt - originalHealth;
                if (excessDamage > 0) newState.players[currentTargetRef.owner]!.leader.currentHealth -= excessDamage;
            }

            if (currentTargetRef.currentHealth > 0 && canCounterAttack) {
                const counterAttackDamage = getUnitTotalAttack(currentTargetRef, newState) * (newState.players[currentTargetRef.owner]!.leader.card.id === 34 ? 0.5 : 1);
                 if (hasEffect(currentTargetRef, 'COUNTER_ATTACK')) {
                    const counterDamage = Math.max(0, counterAttackDamage - getUnitTotalArmor(attackerRef));
                    attackerRef.currentHealth -= counterDamage;
                    newState.log = addLogEntry(newState.log, `${currentTargetRef.card.name} контратакует!`);
                }
                if (currentTargetRef.card.id === 7 && currentTargetRef.position.wave === Wave.Vanguard) { applyEffect(attackerRef, { type: 'FROZEN', duration: 2 }); newState.log = addLogEntry(newState.log, `${attackerRef.card.name} заморожен!`); }
                if (currentTargetRef.card.id === 8 && currentTargetRef.position.wave === Wave.Vanguard) attackerRef.currentHealth -= 1;
                if (currentTargetRef.card.id === 14 && currentTargetRef.position.wave === Wave.Vanguard) { attackerRef.originalCardOnTransform = attackerRef.card; applyEffect(attackerRef, { type: 'TRANSFORMED', duration: 2, payload: { card: SHEEP_TOKEN } }); newState.log = addLogEntry(newState.log, `${attackerRef.card.name} превращен в овцу!`); }
                if (currentTargetRef.card.id === 21 && currentTargetRef.position.wave === Wave.Vanguard) { attackerRef.currentHealth = 0; newState.log = addLogEntry(newState.log, `Взгляд Медузы уничтожает ${attackerRef.card.name}!`); }
                if (currentTargetRef.card.id === 24 && currentTargetRef.position.wave === Wave.Vanguard) { [attackerRef.card.attack, currentTargetRef.card.attack] = [currentTargetRef.card.attack, attackerRef.card.attack]; [attackerRef.card.health, currentTargetRef.card.health] = [currentTargetRef.card.health, attackerRef.card.health]; }
                if (currentTargetRef.card.id === 30 && currentTargetRef.position.wave === Wave.Vanguard) { applyEffect(attackerRef, { type: 'SILENCE', duration: 2 }); newState.log = addLogEntry(newState.log, `На ${attackerRef.card.name} наложена немота!`); }
                if (currentTargetRef.card.id === 33 && currentTargetRef.position.wave === Wave.Vanguard) { applyEffect(attackerRef, { type: 'POISON', value: 1, duration: 3 }); newState.log = addLogEntry(newState.log, `${attackerRef.card.name} отравлен!`); }
                if (currentTargetRef.card.id === 49 && currentTargetRef.position.wave === Wave.Vanguard) newState.players[attackerRef.owner]!.actions = Math.max(0, newState.players[attackerRef.owner]!.actions - 1);
            }
        });

        if (attacker.card.id === 4 && attacker.position.wave === Wave.Vanguard) attackerRef.currentHealth = Math.min(attackerRef.maxHealth, attackerRef.currentHealth + 2);
        
        if (targetRef.currentHealth <= 0) {
            if (attackerRef.card.id === 18 && attackerRef.position.wave === Wave.Vanguard) {
                attackerRef.attacksThisTurn -= 1;
                newState.log = addLogEntry(newState.log, `${attackerRef.card.name} впадает в неистовство и может атаковать снова!`);
            }
            if (attackerRef.card.id === 42 && attackerRef.position.wave === Wave.Flank && !targetRef.id.startsWith('leader-') && actingPlayer.units.length < maxUnits) {
                const spawnPos = findEmptySlot(actingPlayer, targetRef.position.wave, targetRef.position.col) || findEmptySlot(actingPlayer);
                if (spawnPos) {
                    actingPlayer.units.push(createUnitFromCard(VAMPIRE_SPAWN_TOKEN, actingPlayer.id, spawnPos));
                }
            }
        }
        removeEffect(attackerRef, 'PREPARING_ATTACK', true);

        // --- STAGE 4: CLEANUP ---
        const finalState = resolveDeaths(newState);
        finalState.selectedUnit = null;
        return finalState;
    }
    
    case 'END_TURN': {
        const currentPlayer = players[currentPlayerId];
        if (!currentPlayer) return state;
        let newState = cloneState(state);
        let nextPlayer = newState.players[opponentPlayerId]!;
        let endingPlayer = newState.players[currentPlayerId]!;

        // --- PROCESS END OF TURN EFFECTS for current player ---
        endingPlayer.units.forEach(unit => { if (unit.card.id === 13 && unit.position.wave === Wave.Rear) unit.currentHealth = Math.min(unit.maxHealth, unit.currentHealth + 3); });
        
        // --- PROCESS START OF TURN EFFECTS for next player ---
        const unitsAndLeader = [...nextPlayer.units, nextPlayer.leader];
        let turnLog = addLogEntry(log, `Конец хода. Ход переходит к ${nextPlayer.name}.`);

        // LEADER ABILITIES
        if(nextPlayer.leader.card.id === 4){ unitsAndLeader.forEach(u => u.currentHealth = Math.min(u.maxHealth, u.currentHealth + 1)); }

        unitsAndLeader.forEach(unit => {
            const regen = getUnitTotalRegen(unit);
            if (regen > 0) unit.currentHealth = Math.min(unit.maxHealth, unit.currentHealth + regen);
            const poison = getEffectValue(unit, 'POISON');
            if (poison > 0) { unit.currentHealth -= poison; turnLog = addLogEntry(turnLog, `${unit.card.name} получает ${poison} урона от яда.`); }

            unit.effects = unit.effects.map(effect => ({ ...effect, duration: effect.duration > 0 ? effect.duration - 1 : effect.duration })).filter(effect => effect.duration !== 0);

            if (!hasEffect(unit, 'TRANSFORMED') && unit.originalCardOnTransform) {
                unit.card = unit.originalCardOnTransform; unit.maxHealth = unit.card.health; unit.currentHealth = Math.min(unit.currentHealth, unit.maxHealth); delete unit.originalCardOnTransform;
            }
            if(unit.owner === nextPlayer.id) {
                unit.canAttack = true;
                unit.attacksThisTurn = 0;
            }
            if (unit.isRebirthingFor > 0) { if (--unit.isRebirthingFor === 0) unit.currentHealth = unit.maxHealth; }
        });
        
        // Banish return
        nextPlayer.banishedUnits = nextPlayer.banishedUnits.filter(u => {
            if (--u.isRebirthingFor <= 0) {
                const slot = findEmptySlot(nextPlayer);
                if(slot) { u.position = slot; nextPlayer.units.push(u); }
                return false;
            }
            return true;
        });
        
        if (!newState.game.globalEffects[nextPlayer.id]?.noCardsNextTurn && nextPlayer.deck.length > 0 && nextPlayer.hand.length < 10) {
            nextPlayer.hand.push(nextPlayer.deck.shift()!);
        }
        
        const actionDebuff = newState.game.globalEffects[nextPlayer.id]?.cardCostIncrease || 0;
        const leaderCardId = nextPlayer.leader.card.id;
        nextPlayer.actions = (leaderCardId === 46 ? 3 : leaderCardId === 7 ? 1 : ACTIONS_PER_TURN) - actionDebuff;
        if(newState.game.globalEffects.fieldEffect === 'SWAMP') nextPlayer.actions = Math.floor(nextPlayer.actions / 2);
        
        delete newState.game.globalEffects[nextPlayer.id];

        endingPlayer.actions = 0;

        newState.game = { ...game, phase: opponentPlayerId === PlayerID.Player1 ? GamePhase.PLAYER_1_TURN : GamePhase.PLAYER_2_TURN, currentPlayer: opponentPlayerId, turn: opponentPlayerId === PlayerID.Player1 ? game.turn + 1 : game.turn };
        newState.log = turnLog;
        newState.selectedCard = null;
        newState.selectedUnit = null;

        return resolveDeaths(newState);
    }

    case 'REQUEST_RESTART': return state;
    default: return state;
  }
};