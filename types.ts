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
  tribe?: string;
}

export type EffectType = 
  | 'ATTACK_BUFF'
  | 'REGENERATION'
  | 'ARMOR'
  | 'POISON'
  | 'FROZEN' // Cannot attack
  | 'STUN' // Cannot act at all
  | 'SILENCE' // Abilities are disabled
  | 'DIVINE_SHIELD' // Block next source of damage
  | 'STEALTH' // Cannot be targeted if other units are available
  | 'PROVOKE' // Must be attacked
  | 'LIFESTEAL'
  | 'ENRAGED' // Active while damaged
  | 'COUNTER_ATTACK'
  | 'IMMUNE_TO_ABILITIES'
  | 'DODGE' // % chance
  | 'IGNORE_VANGUARD'
  | 'FIRST_STRIKE'
  | 'SPELL_PROOF' // Cannot be targeted by abilities
  | 'PETRIFIED' // Cannot act, basically stun
  | 'WINDFURY' // Can attack twice
  | 'IGNORE_STEALTH'
  | 'CANNOT_BE_HEALED'
  | 'TRAMPLE' // Excess damage hits leader
  | 'TRANSFORMED' // Is transformed into another creature
  | 'PREPARING_ATTACK'; // For Blade Master's rear ability

export interface UnitEffect {
  type: EffectType;
  duration: number; // Number of owner's START turns it lasts. -1 for permanent.
  value?: number;   // e.g., amount of buff/debuff/regen/dodge chance
  sourceCardId?: number; // ID of the card that applied the effect
  payload?: any; // For complex effects like transformation
}


export interface Unit {
  id: string; // Unique instance ID
  card: CardData;
  currentHealth: number;
  maxHealth: number;
  position: {
    wave: Wave;
    col: number;
  };
  owner: PlayerID;
  canAttack: boolean;
  attacksThisTurn: number;
  souls: number; // For Soulstealer

  effects: UnitEffect[];
  
  isRebirthingFor: number; // For Phoenix
  originalCardOnDeath?: CardData; // For Phoenix to remember what to turn back into
  originalCardOnTransform?: CardData; // For Witch's sheep
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
  deadUnits: CardData[]; // For resurrection mechanics
  banishedUnits: Unit[]; // For Demon Hunter's ability
  usedLeaderAbility: boolean; // For once-per-game leader abilities
}

export interface GlobalPlayerEffects {
    cardCostIncrease?: number;
    isHandVisible?: boolean;
    disableLeaderAbility?: boolean;
    missChance?: number; // value from 0 to 100
    abilityDamageBonus?: number;
    cannotSummonTribes?: string[];
    canMoveFreely?: boolean;
    planningPhase?: boolean; // For future features
    noCardsNextTurn?: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: PlayerID;
  turn: number;
  winner: PlayerID | null;
  globalEffects: {
    [key in PlayerID]?: GlobalPlayerEffects
  } & {
    fieldEffect?: 'SWAMP';
    brokenCells?: { position: { wave: Wave, col: number }, turnsLeft: number }[];
  }
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