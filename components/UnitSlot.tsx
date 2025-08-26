import React from 'react';
import type { Unit, PlayerID, Wave, GameAction } from '../types';
import { UnitView } from './UnitView';

interface UnitSlotProps {
  unit: Unit | null;
  wave: Wave;
  col: number;
  ownerId: PlayerID;
  isPlayable: boolean;
  isTargetable: boolean;
  isSelected: boolean;
  dispatch: React.Dispatch<GameAction>;
  attacker: Unit | null;
  isLocalPlayer: boolean;
  isCurrentPlayer: boolean;
}

export const UnitSlot: React.FC<UnitSlotProps> = ({
  unit,
  wave,
  col,
  ownerId,
  isPlayable,
  isTargetable,
  isSelected,
  dispatch,
  attacker,
  isLocalPlayer,
  isCurrentPlayer,
}) => {
  const handleSlotClick = () => {
    if (isPlayable && !unit) {
      dispatch({ type: 'PLAY_CARD', payload: { position: { wave, col } } });
    }
  };

  const baseClasses = 'w-full h-32 flex items-center justify-center rounded-md transition-all duration-200';
  const emptySlotClasses = isPlayable
    ? 'bg-green-800/50 border-2 hover:bg-green-700/50 cursor-pointer pulse-playable-slot'
    : 'bg-black/30 border border-gray-700';

  if (!unit) {
    return <div className={`${baseClasses} ${emptySlotClasses}`} onClick={handleSlotClick} />;
  }

  return (
    <div className={baseClasses}>
      <UnitView
        unit={unit}
        isSelected={isSelected}
        isTargetable={isTargetable}
        dispatch={dispatch}
        attacker={attacker}
        isLocalPlayer={isLocalPlayer}
        isCurrentPlayer={isCurrentPlayer}
      />
    </div>
  );
};