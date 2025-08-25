export enum PlayerID {
  Player1 = 'Player1',
  Player2 = 'Player2',
}

export enum Wave {
  Vanguard = 'Авангард',
  Flank = 'Фланг',
  Rear = 'Тыл',
}

export enum GamePhase {
  MENU = 'MENU',
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  PLAYER_1_TURN = 'PLAYER_1_TURN',
  PLAYER_2_TURN = 'PLAYER_2_TURN',
  GAME_OVER = 'GAME_OVER',
}

export interface CardData {
  id: number;
  name: string;
  artUrl: string;
  attack: number;
  health: number;
  vanguardAbility: string;
  flankAbility: string;
  rearAbility: string;
  leaderAbility: string;
}

export interface Unit {
  id: string; // Unique instance ID
  card: CardData;
  currentHealth: number;
  position: {
    wave: Wave;
    col: number;
  };
  owner: PlayerID;
  canAttack: boolean;
}

export interface Player {
  id: PlayerID;
  name: string;
  leader: Unit;
  deck: CardData[];
  hand: CardData[];
  discard: CardData[];
  units: Unit[];
  actions: number;
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: PlayerID;
  turn: number;
  winner: PlayerID | null;
}

export type GridSlot = Unit | null;

export type Grid = [
  [GridSlot, GridSlot, GridSlot], // Rear
  [GridSlot, GridSlot, GridSlot], // Flank
  [GridSlot, GridSlot, GridSlot]  // Vanguard
];

// --- New Multiplayer Types ---

export interface FullGameState {
  game: GameState;
  players: { [key in PlayerID]: Player | null };
  log: string[];
  selectedCard: { player: PlayerID, card: CardData } | null;
  selectedUnit: Unit | null;
}

export type GameAction = 
  | { type: 'SET_FULL_STATE'; payload: FullGameState }
  | { type: 'SETUP_GAME'; payload: { deck: CardData[] } }
  | { type: 'SELECT_CARD'; payload: { playerId: PlayerID, card: CardData } }
  | { type: 'SELECT_UNIT'; payload: { unit: Unit } }
  | { type: 'PLAY_CARD'; payload: { position: { wave: Wave, col: number } } }
  | { type: 'ATTACK'; payload: { target: Unit } }
  | { type: 'END_TURN' }
  | { type: 'REQUEST_RESTART' };

export type NetworkMessage = 
  | { type: 'JOIN_REQUEST' }
  | { type: 'GAME_START'; payload: { state: FullGameState } }
  | { type: 'ACTION'; payload: GameAction }
  | { type: 'RESTART_REQUEST' };