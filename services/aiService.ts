import type { FullGameState, GameAction, Unit, Wave, CardData } from '../types';
import { PlayerID } from '../types';
import { WAVE_ORDER } from '../constants';

export type AIActions = GameAction[];

// --- AI HELPER FUNCTIONS ---

const hasEffect = (unit: Unit, effectType: string): boolean => unit.effects.some(e => e.type === effectType);

const getUnitTotalAttack = (unit: Unit, state: FullGameState): number => {
    const base = unit.card.attack;
    const bonus = unit.effects.filter(e => e.type === 'ATTACK_BUFF').reduce((sum, e) => sum + (e.value || 0), 0);
    const enrageBonus = hasEffect(unit, 'ENRAGED') && unit.currentHealth < unit.maxHealth ? 2 : 0;
    const leaderDebuff = state.players[unit.owner === 'Player1' ? 'Player2' : 'Player1']?.leader.card.id === 14 ? -1 : 0;
    return Math.max(0, base + bonus + enrageBonus + unit.souls + leaderDebuff);
};


// --- SCORING FUNCTIONS ---

const scoreTarget = (target: Unit, attacker: Unit, state: FullGameState): number => {
    let score = 50; // Base score for a valid target
    const attackPower = getUnitTotalAttack(attacker, state);

    // Prioritize lethal
    if (target.currentHealth <= attackPower) {
        score += 150 + target.card.attack * 10; // High score for killing, especially high-attack units
        if(target.id.startsWith('leader-')) score += 1000; // WIN THE GAME
    }

    // Prioritize high-threat units (high attack or special abilities)
    score += target.card.attack * 5;
    if (hasEffect(target, 'REGENERATION')) score += 20;
    if (hasEffect(target, 'LIFESTEAL')) score += 25;
    
    // Prioritize leader if they are low health
    if (target.id.startsWith('leader-') && target.currentHealth < 15) {
        score += 50;
    }
    
    // Deprioritize low-value targets
    if (target.card.attack <= 1 && target.card.health <= 2) {
        score -= 20;
    }
    
    // Avoid targets with Divine Shield or high armor/dodge/counter
    if (hasEffect(target, 'DIVINE_SHIELD')) score -= 80;
    if (hasEffect(target, 'COUNTER_ATTACK')) score -= 40;
    if (hasEffect(target, 'DODGE')) score -= 40;
    if (target.card.id === 21 && target.position.wave === 'Авангард') score = -100; // Avoid attacking Medusa head-on

    return score;
}

const scoreCardPlay = (card: CardData, position: {wave: Wave, col: number}, state: FullGameState): number => {
    let score = (card.attack + card.health) * 2; // Base score on stats
    const aiPlayer = state.players[PlayerID.Player2]!;
    const opponent = state.players[PlayerID.Player1]!;
    
    // Positional value
    if (position.wave === 'Авангард') {
        score += card.health * 1.5;
        if (card.vanguardAbility.includes('Провокация')) score += 30;
    } else {
        score += card.attack * 1.5;
    }

    // Ability-based scoring
    switch (card.id) {
        // --- Summoners ---
        case 6: // Gnome Engineer (Vanguard)
            if (position.wave === 'Авангард') score += 40; // Turret is good
            break;
        case 10: // Necromancer
            score += (position.wave === 'Тыл' ? 2 : 1) * 25; // Skeletons are good
            break;
        case 11: // Goblin King
             if (position.wave === 'Фланг') score += aiPlayer.units.filter(u => u.card.tribe === 'Гоблин').length * 15 + 10;
             if (position.wave === 'Тыл') score += 3 * 20;
             break;
        case 40: // Forest Spirit
            if (position.wave === 'Тыл') score += 2 * 25; // Wolves are good
            break;

        // --- AoE / Board Control ---
        case 5: // Ogre Berserker (Rear)
            if (position.wave === 'Тыл') score += opponent.units.length * 10;
            break;
        case 7: // Ice Mage (Rear)
            if (position.wave === 'Тыл') score += opponent.units.length * 12;
            break;
        case 8: // Fire Elemental (Rear)
             if (position.wave === 'Тыл') score += opponent.units.filter(u => u.position.col === position.col).length * 15;
             break;
        case 36: // Bombardier (Flank)
            if (position.wave === 'Фланг') {
                // Approximate the AoE damage potential
                score += opponent.units.length * 6 + 20; 
            }
            if (position.wave === 'Тыл') score += 30; // Placing a trap is generally good
            break;
        
        // --- High Value Single Target ---
        case 2: // Shadow Assassin (Rear)
            if (position.wave === 'Тыл' && [...opponent.units, opponent.leader].some(u => u.currentHealth <= 3)) score += 80;
            break;
        case 14: // Witch (Rear)
             if (position.wave === 'Тыл' && opponent.units.some(u => getUnitTotalAttack(u, state) <= 3)) score += 100;
             break;
        case 38: // Archmage (Rear)
            if (position.wave === 'Тыл') score += 60; // 6 damage is a lot
            break;

        // --- Buffs / Support ---
        case 4: // War Priest - Healer/Resurrector
            if (position.wave === 'Фланг' && aiPlayer.units.some(u => u.currentHealth < u.maxHealth)) score += 40;
            if (position.wave === 'Тыл' && aiPlayer.deadUnits.length > 0) score += 60;
            break;
        case 9: // Paladin
             if (position.wave === 'Фланг') score += 45; // Divine shield is great
             if (position.wave === 'Тыл' && aiPlayer.units.some(u => u.currentHealth < u.maxHealth)) score += 40;
             break;
        case 12: // Dragon (Rear)
             if (position.wave === 'Тыл') score += aiPlayer.units.length * 10 + 20;
             break;
    }
    return score;
}

/**
 * An improved, rule-based AI that makes more strategic moves.
 */
export const getAIMove = (state: FullGameState): AIActions => {
    const aiPlayer = state.players[PlayerID.Player2];
    const opponent = state.players[PlayerID.Player1];
    if (!aiPlayer || !opponent) return [{ type: 'END_TURN' }];

    let actionsLeft = aiPlayer.actions;
    const generatedActions: GameAction[] = [];
    
    // Create a mutable copy of the game state to simulate actions
    let simulatedState = JSON.parse(JSON.stringify(state));

    while (actionsLeft > 0) {
        const simAiPlayer = simulatedState.players[PlayerID.Player2];
        const simOpponent = simulatedState.players[PlayerID.Player1];
        
        // --- Find Best Possible Attack ---
        const availableAttackers = [...simAiPlayer.units, simAiPlayer.leader].filter(u => u.canAttack && u.attacksThisTurn < (hasEffect(u, 'WINDFURY') ? 2 : 1) && !hasEffect(u, 'FROZEN') && !hasEffect(u, 'STUN') && !hasEffect(u, 'PETRIFIED'));
        let bestAttack = { score: 15, attacker: null as Unit | null, target: null as Unit | null }; // Base score > 0 to prefer attacking over nothing

        if (availableAttackers.length > 0) {
            for (const attacker of availableAttackers) {
                const provokingUnits = simOpponent.units.filter(u => hasEffect(u, 'PROVOKE'));
                let possibleTargets: Unit[];
                 if (provokingUnits.length > 0) {
                    possibleTargets = provokingUnits;
                 } else {
                    const hasVanguard = simOpponent.units.some(u => u.position.wave === 'Авангард');
                    const canIgnoreVanguard = hasEffect(attacker, 'IGNORE_VANGUARD');
                    possibleTargets = (hasVanguard && !canIgnoreVanguard)
                        ? simOpponent.units.filter(u => u.position.wave === 'Авангард')
                        : [...simOpponent.units, simOpponent.leader];
                 }

                 let finalTargets = possibleTargets.filter(t => !hasEffect(t, 'STEALTH') || simOpponent.units.every(u => hasEffect(u, 'STEALTH')));

                 for(const target of finalTargets) {
                    const currentScore = scoreTarget(target, attacker, simulatedState);
                    if (currentScore > bestAttack.score) {
                        bestAttack = { score: currentScore, attacker, target };
                    }
                 }
            }
        }
        
        // --- Find Best Possible Card Play ---
        const aiOccupiedSlots = new Set(simAiPlayer.units.map(u => `${u.position.wave}-${u.position.col}`));
        const availablePositions: { wave: Wave, col: number }[] = [];
        const maxUnits = aiPlayer.leader.card.id === 41 ? 10 : 9;
        if (simAiPlayer.units.length < maxUnits) {
            WAVE_ORDER.forEach(wave => {
                for (let col = 0; col < 3; col++) {
                    if (!aiOccupiedSlots.has(`${wave}-${col}`)) {
                        availablePositions.push({ wave, col });
                    }
                }
            });
        }
        
        let bestPlay = { score: 0, card: null as CardData | null, position: null as {wave: Wave, col: number} | null };
        if (availablePositions.length > 0) {
            for (const card of simAiPlayer.hand) {
                for (const position of availablePositions) {
                    const currentScore = scoreCardPlay(card, position, simulatedState);
                    if (currentScore > bestPlay.score) {
                        bestPlay = { score: currentScore, card, position };
                    }
                }
            }
        }

        // --- Decide Action: Attack vs Play Card ---
        const attackScore = bestAttack.score;
        const playScore = bestPlay.score;

        if (attackScore > 20 && attackScore >= playScore) {
            const originalAttacker = state.players[PlayerID.Player2]!.units.find(u => u.id === bestAttack.attacker!.id) || state.players[PlayerID.Player2]!.leader;
            const originalTarget = state.players[PlayerID.Player1]!.units.find(u => u.id === bestAttack.target!.id) || state.players[PlayerID.Player1]!.leader;
            
            if (!originalAttacker || !originalTarget) continue;

            generatedActions.push({ type: 'SELECT_UNIT', payload: { unit: originalAttacker } });
            generatedActions.push({ type: 'ATTACK', payload: { target: originalTarget } });
            
            const attackerInState = [...simulatedState.players.Player2!.units, simulatedState.players.Player2!.leader].find(u => u.id === bestAttack.attacker!.id)!
            attackerInState.attacksThisTurn += 1;
        } else if (playScore > 20) {
            generatedActions.push({ type: 'SELECT_CARD', payload: { playerId: PlayerID.Player2, card: bestPlay.card! } });
            generatedActions.push({ type: 'PLAY_CARD', payload: { position: bestPlay.position! } });

            simulatedState.players.Player2!.hand = simulatedState.players.Player2!.hand.filter(c => c.id !== bestPlay.card!.id);
            simulatedState.players.Player2!.units.push({id: `temp-${Math.random()}`, card: bestPlay.card!, position: bestPlay.position!} as Unit);
        } else {
            break;
        }

        actionsLeft--;
    }
    
    generatedActions.push({ type: 'END_TURN' });
    return generatedActions;
};