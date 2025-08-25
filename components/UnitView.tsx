import React from 'react';
import type { Unit, GameAction } from '../types';
import { Wave } from '../types';

interface UnitViewProps {
  unit: Unit;
  isSelected: boolean;
  isTargetable: boolean;
  dispatch: React.Dispatch<GameAction>;
  attacker: Unit | null;
}

const getAbilityForWave = (card: Unit['card'], wave: Wave): string => {
    switch (wave) {
        case Wave.Vanguard: return card.vanguardAbility;
        case Wave.Flank: return card.flankAbility;
        case Wave.Rear: return card.rearAbility;
        default: return '';
    }
}

export const UnitView: React.FC<UnitViewProps> = ({ unit, isSelected, isTargetable, dispatch, attacker }) => {
  const isLeader = unit.id.startsWith('leader');
  const wave = unit.position.wave;
  const abilityText = isLeader ? unit.card.leaderAbility : getAbilityForWave(unit.card, wave);

  const handleClick = () => {
    if (isTargetable && attacker) {
      dispatch({ type: 'ATTACK', payload: { target: unit }});
    } else {
      dispatch({ type: 'SELECT_UNIT', payload: { unit }});
    }
  };

  const borderClass = isSelected
    ? 'border-yellow-400 ring-2 ring-yellow-400'
    : isTargetable
    ? 'border-red-500 ring-2 ring-red-500 cursor-crosshair'
    : unit.canAttack ? 'border-green-500' : 'border-gray-600';

  const healthPercentage = (unit.currentHealth / (isLeader ? 25 : unit.card.health)) * 100;

  return (
    <div
      className={`relative w-24 h-32 bg-gray-800 rounded-md border-2 p-1 flex flex-col justify-between text-center text-xs cursor-pointer transform hover:scale-105 transition-transform duration-200 ${borderClass} group`}
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/70 transition-colors duration-200 z-10 p-1 overflow-hidden">
        <p className="font-bold text-white text-[10px] leading-tight">{unit.card.name}</p>
        <p className="text-gray-300 text-[8px] leading-tight mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity duration-200">{abilityText}</p>
      </div>

      <img src={unit.card.artUrl} alt={unit.card.name} className="absolute inset-0 w-full h-full object-cover rounded pixelated opacity-40" />
      
      <div className="absolute bottom-1 left-1 right-1 z-20">
        <div className="relative w-full h-3 bg-red-800 border border-black rounded-sm overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-red-500" style={{ width: `${healthPercentage}%` }}/>
          <span className="absolute inset-0 text-white font-bold text-[9px] leading-3 flex items-center justify-center mix-blend-difference">{unit.currentHealth}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full border-2 border-black text-sm font-bold">{unit.card.attack}</span>
        </div>
      </div>
    </div>
  );
};
