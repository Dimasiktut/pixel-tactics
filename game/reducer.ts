import type { FullGameState, GameAction, Player, Unit, CardData } from '../types';
import { GamePhase, Wave, PlayerID } from '../types';
import { HAND_SIZE, LEADER_HEALTH, ACTIONS_PER_TURN, PLAYER1_NAME, PLAYER2_NAME } from '../constants';

const shuffleDeck = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const createInitialPlayer = (id: PlayerID, name: string, leaderCard: CardData, deck: CardData[], hand: CardData[]): Player => ({
  id,
  name,
  leader: {
    id: `leader-${id}`,
    card: leaderCard,
    currentHealth: LEADER_HEALTH,
    position: { wave: Wave.Flank, col: 1 },
    owner: id,
    canAttack: true,
  },
  deck,
  hand,
  discard: [],
  units: [],
  actions: ACTIONS_PER_TURN,
});


export const createInitialState = (): FullGameState => ({
  game: {
    phase: GamePhase.MENU,
    currentPlayer: PlayerID.Player1,
    turn: 1,
    winner: null,
  },
  players: {
    Player1: null,
    Player2: null,
  },
  log: [],
  selectedCard: null,
  selectedUnit: null,
});

export const gameReducer = (state: FullGameState, action: GameAction): FullGameState => {
  const newState = JSON.parse(JSON.stringify(state)) as FullGameState;
  const { game, players, log } = newState;
  const currentPlayer = players[game.currentPlayer];

  const addLog = (message: string) => {
    log.unshift(message);
    if (log.length > 100) log.pop();
  };

  switch (action.type) {
    case 'SET_FULL_STATE':
        return action.payload;

    case 'SETUP_GAME': {
      const { deck } = action.payload;
      const initial = createInitialState();
      const fullDeck = [...deck];
      const shuffled = shuffleDeck(fullDeck);
      
      const p1Leader = shuffled.shift()!;
      const p2Leader = shuffled.shift()!;

      const p1Deck = shuffled.slice(0, 24);
      const p2Deck = shuffled.slice(24);

      const p1Hand = p1Deck.splice(0, HAND_SIZE);
      const p2Hand = p2Deck.splice(0, HAND_SIZE);

      const player1 = createInitialPlayer(PlayerID.Player1, PLAYER1_NAME, p1Leader, p1Deck, p1Hand);
      const player2 = createInitialPlayer(PlayerID.Player2, PLAYER2_NAME, p2Leader, p2Deck, p2Hand);
      
      player1.actions = ACTIONS_PER_TURN;
      player2.actions = 0; // P2 starts with 0 actions

      initial.players = { Player1: player1, Player2: player2 };
      initial.game = { phase: GamePhase.PLAYER_1_TURN, currentPlayer: PlayerID.Player1, turn: 1, winner: null };
      initial.log.unshift(`Игра началась! Ход игрока ${PLAYER1_NAME}.`);
      return initial;
    }
    
    case 'SELECT_CARD': {
        const { playerId, card } = action.payload;
        if (game.currentPlayer !== playerId || (game.phase !== GamePhase.PLAYER_1_TURN && game.phase !== GamePhase.PLAYER_2_TURN)) return state;
        if (players[playerId]!.actions === 0) {
            addLog('Нет очков действий.');
            return state;
        }
        newState.selectedCard = { player: playerId, card };
        newState.selectedUnit = null;
        return newState;
    }
    
    case 'SELECT_UNIT': {
        const { unit } = action.payload;
        if (game.currentPlayer !== unit.owner || (game.phase !== GamePhase.PLAYER_1_TURN && game.phase !== GamePhase.PLAYER_2_TURN)) return state;
        if (!unit.canAttack) {
            addLog(`${unit.card.name} не может атаковать в этом ходу.`);
            return state;
        }
        newState.selectedUnit = unit;
        newState.selectedCard = null;
        return newState;
    }
    
    case 'PLAY_CARD': {
        const { position } = action.payload;
        const { selectedCard } = state;

        if (!selectedCard || selectedCard.player !== game.currentPlayer || !currentPlayer || currentPlayer.actions <= 0) return state;

        const newUnit: Unit = {
            id: `${game.currentPlayer}-${selectedCard.card.id}-${Date.now()}`,
            card: selectedCard.card,
            currentHealth: selectedCard.card.health,
            position,
            owner: game.currentPlayer,
            canAttack: false, // Summoning sickness
        };

        currentPlayer.units.push(newUnit);
        currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== selectedCard.card.id);
        currentPlayer.actions -= 1;
        
        addLog(`${currentPlayer.name} разыграл ${newUnit.card.name} в ряду: ${position.wave}.`);
        newState.selectedCard = null;
        return newState;
    }

    case 'ATTACK': {
        const { target } = action.payload;
        const attacker = state.selectedUnit;

        if (!attacker || !attacker.canAttack || attacker.owner !== game.currentPlayer || !currentPlayer || currentPlayer.actions <= 0) {
            addLog('Невозможно атаковать.');
            return state;
        }

        addLog(`${attacker.card.name} атакует ${target.card.name} и наносит ${attacker.card.attack} урона!`);

        const targetPlayer = players[target.owner]!;
        const sourcePlayer = players[attacker.owner]!;
        
        let targetUnit = target.id.startsWith('leader') ? targetPlayer.leader : targetPlayer.units.find(u => u.id === target.id);

        if (targetUnit) {
            targetUnit.currentHealth -= attacker.card.attack;
            if (targetUnit.currentHealth <= 0) {
                addLog(`${target.card.name} побежден!`);
                if (target.id.startsWith('leader-')) {
                    addLog(`Лидер игрока ${targetPlayer.name} побежден!`);
                    game.phase = GamePhase.GAME_OVER;
                    game.winner = attacker.owner;
                    addLog(`Игра окончена! ${sourcePlayer.name} побеждает!`);
                } else {
                    targetPlayer.units = targetPlayer.units.filter(u => u.id !== target.id);
                }
            }
        }
        
        const attackerInPlayer = sourcePlayer.units.find(u => u.id === attacker.id);
        if (attackerInPlayer) attackerInPlayer.canAttack = false;
        if(sourcePlayer.leader.id === attacker.id) sourcePlayer.leader.canAttack = false;

        sourcePlayer.actions -= 1;
        newState.selectedUnit = null;
        return newState;
    }
    
    case 'END_TURN': {
        if (game.phase !== GamePhase.PLAYER_1_TURN && game.phase !== GamePhase.PLAYER_2_TURN) return state;

        const nextPlayerID = game.currentPlayer === PlayerID.Player1 ? PlayerID.Player2 : PlayerID.Player1;
        const nextPlayer = players[nextPlayerID]!;

        if (nextPlayer.deck.length > 0) {
            const drawnCard = nextPlayer.deck.shift()!;
            if (nextPlayer.hand.length < 10) {
                nextPlayer.hand.push(drawnCard);
            }
        } else {
            addLog(`${nextPlayer.name} не имеет карт для добора!`);
        }

        nextPlayer.actions = ACTIONS_PER_TURN;
        nextPlayer.units.forEach(u => u.canAttack = true);
        if (nextPlayer.leader) nextPlayer.leader.canAttack = true;

        if(currentPlayer) currentPlayer.actions = 0;
        
        game.phase = nextPlayerID === PlayerID.Player1 ? GamePhase.PLAYER_1_TURN : GamePhase.PLAYER_2_TURN;
        game.currentPlayer = nextPlayerID;
        if(nextPlayerID === PlayerID.Player1) game.turn +=1;

        addLog(`Конец хода. Ход переходит к ${nextPlayer.name}.`);
        newState.selectedCard = null;
        newState.selectedUnit = null;
        return newState;
    }

    case 'REQUEST_RESTART': {
        // This action is handled by the multiplayer hook, not the reducer.
        // It signals an intent to restart, but doesn't change state directly.
        return state;
    }
    
    default:
      return state;
  }
};