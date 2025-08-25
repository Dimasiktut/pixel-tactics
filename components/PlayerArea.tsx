import React from 'react';
import type { Player, Unit, CardData, Grid, GameState, PlayerID, GameAction, Wave } from '../types';
import { CardView } from './CardView';
import { UnitView } from './UnitView';
import { UnitSlot } from './UnitSlot';
import { WAVE_ORDER } from '../constants';

interface PlayerAreaProps {
  player: Player;
  isOpponent: boolean;
  isCurrentPlayer: boolean;
  isLocalPlayer: boolean;
  selectedCard?: { player: PlayerID, card: CardData } | null;
  selectedUnit: Unit | null;
  dispatch: React.Dispatch<GameAction>;
  phase: GameState['phase'];
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isOpponent,
  isCurrentPlayer,
  isLocalPlayer,
  selectedCard,
  selectedUnit,
  dispatch,
  phase,
}) => {
  const grid: Grid = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  player.units.forEach(unit => {
    const waveIndex = WAVE_ORDER.indexOf(unit.position.wave);
    if (waveIndex !== -1 && unit.position.col >= 0 && unit.position.col < 3) {
      grid[waveIndex][unit.position.col] = unit;
    }
  });

  const gridDisplayOrder = isOpponent ? [...WAVE_ORDER].reverse() : WAVE_ORDER;

  return (
    <div className={`p-2 md:p-4 rounded-lg border-2 ${isCurrentPlayer ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-gray-700'} bg-black bg-opacity-40`}>
      <div className="flex justify-between items-start mb-4">
        {/* Player Info and Leader */}
        <div className="flex items-center gap-4">
            <UnitView
                unit={player.leader}
                isSelected={selectedUnit?.id === player.leader.id}
                isTargetable={!!selectedUnit && selectedUnit.owner !== player.id}
                dispatch={dispatch}
                attacker={selectedUnit}
            />
            <div>
                <h2 className={`text-lg md:text-xl font-bold ${isCurrentPlayer ? 'text-yellow-300' : 'text-gray-300'}`}>{player.name}</h2>
                <p>Действия: {player.actions}</p>
            </div>
        </div>

        {/* Deck and Discard Info */}
        <div className="text-right text-sm">
          <p>Колода: {player.deck.length}</p>
          <p>Сброс: {player.discard.length}</p>
          <p>Рука: {player.hand.length}</p>
        </div>
      </div>

      {/* Grid and Hand */}
      <div className="flex flex-col-reverse md:flex-row gap-4">
        {/* Grid */}
        <div className="flex-grow grid grid-cols-3 gap-2">
            {gridDisplayOrder.map((wave) => {
                const actualWaveIndex = WAVE_ORDER.indexOf(wave);
                return (
                    <React.Fragment key={wave}>
                    {grid[actualWaveIndex].map((unit, colIndex) => (
                        <UnitSlot
                            key={`${wave}-${colIndex}`}
                            unit={unit}
                            wave={wave}
                            col={colIndex}
                            ownerId={player.id}
                            isTargetable={!!selectedUnit && selectedUnit.owner !== player.id}
                            isPlayable={isLocalPlayer && !!selectedCard && selectedCard.player === player.id}
                            isSelected={selectedUnit?.id === unit?.id}
                            dispatch={dispatch}
                            attacker={selectedUnit}
                        />
                    ))}
                    </React.Fragment>
                )
            })}
        </div>

        {/* Hand */}
        {isLocalPlayer && (
          <div className="flex md:flex-col gap-2 p-2 bg-gray-900/50 rounded-md overflow-x-auto md:overflow-y-auto md:h-[24rem] md:w-32">
            {player.hand.map((card) => (
              <CardView
                key={card.id}
                card={card}
                isSelected={selectedCard?.card.id === card.id}
                onSelect={() => dispatch({ type: 'SELECT_CARD', payload: { playerId: player.id, card }})}
                isPlayable={isCurrentPlayer && player.actions > 0 && phase !== 'GAME_OVER'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
