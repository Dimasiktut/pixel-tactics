import React from 'react';
import type { Unit, GameAction, EffectType } from '../types';
import { Wave } from '../types';

interface UnitViewProps {
  unit: Unit;
  isSelected: boolean;
  isTargetable: boolean;
  dispatch: React.Dispatch<GameAction>;
  attacker: Unit | null;
  isLocalPlayer: boolean;
  isCurrentPlayer: boolean;
}

const hasEffect = (unit: Unit, effectType: EffectType): boolean => unit.effects.some(e => e.type === effectType);
const getEffectValue = (unit: Unit, effectType: EffectType, defaultValue: number = 0): number => {
    return unit.effects
        .filter(e => e.type === effectType)
        .reduce((sum, e) => sum + (e.value || 0), defaultValue);
};

const getUnitTotalAttack = (unit: Unit): number => {
    const base = unit.card.attack;
    const bonus = getEffectValue(unit, 'ATTACK_BUFF');
    const enrageBonus = hasEffect(unit, 'ENRAGED') && unit.currentHealth < unit.maxHealth ? 2 : 0;
    return Math.max(0, base + bonus + unit.souls);
};

const getAbilityForWave = (card: Unit['card'], wave: Wave): string => {
    switch (wave) {
        case Wave.Vanguard: return card.vanguardAbility;
        case Wave.Flank: return card.flankAbility;
        case Wave.Rear: return card.rearAbility;
        default: return '';
    }
}

export const UnitView: React.FC<UnitViewProps> = ({
    unit,
    isSelected,
    isTargetable,
    dispatch,
    attacker,
    isLocalPlayer,
    isCurrentPlayer
}) => {
  const isLeader = unit.id.startsWith('leader');
  const wave = unit.position.wave;
  const abilityText = isLeader ? unit.card.leaderAbility : getAbilityForWave(unit.card, wave);

  const isStunnedOrFrozen = hasEffect(unit, 'STUN') || hasEffect(unit, 'FROZEN') || hasEffect(unit, 'PETRIFIED');
  const maxAttacks = hasEffect(unit, 'WINDFURY') ? 2 : 1;
  const canPerformAttack = unit.canAttack && !isStunnedOrFrozen && unit.attacksThisTurn < maxAttacks;

  const canBeSelected = isLocalPlayer && isCurrentPlayer && canPerformAttack;
  const canBeAttacked = isTargetable && attacker;
  const isClickable = canBeSelected || canBeAttacked;

  const handleClick = () => {
    if (!isClickable) return;

    if (canBeAttacked) {
      dispatch({ type: 'ATTACK', payload: { target: unit } });
    } else if (canBeSelected) {
      dispatch({ type: 'SELECT_UNIT', payload: { unit } });
    }
  };
  
  const totalAttack = getUnitTotalAttack(unit);
  const armor = getEffectValue(unit, 'ARMOR');
  const regeneration = getEffectValue(unit, 'REGENERATION');
  const isPoisoned = hasEffect(unit, 'POISON');
  const isSilenced = hasEffect(unit, 'SILENCE');

  const hasProvoke = hasEffect(unit, 'PROVOKE');
  const hasDivineShield = hasEffect(unit, 'DIVINE_SHIELD');
  const hasStealth = hasEffect(unit, 'STEALTH');
  const isEnraged = hasEffect(unit, 'ENRAGED');

  let borderClass = 'border-gray-600';
  if (isSelected) {
      borderClass = 'border-yellow-400 ring-2 ring-yellow-400';
  } else if (canBeAttacked) {
      borderClass = 'border-red-500 ring-2 ring-red-500';
  } else if (canBeSelected) {
      borderClass = 'border-cyan-400';
  } else if (hasProvoke) {
      borderClass = 'border-amber-500';
  }
  
  const animationClass = (canBeSelected && !isSelected) ? 'glow-playable' : (canBeAttacked ? 'pulse-targetable' : '');

  const cursorClass = isClickable
    ? (canBeAttacked ? 'cursor-crosshair' : 'cursor-pointer')
    : 'cursor-default';


  const healthPercentage = (unit.currentHealth / unit.maxHealth) * 100;

  return (
    <div
      className={`relative w-24 h-32 bg-gray-800 rounded-md border-2 p-1 flex flex-col justify-between text-center text-xs transform hover:scale-105 transition-transform duration-200 ${borderClass} ${cursorClass} ${animationClass} group`}
      onClick={handleClick}
    >
      {/* --- ABILITY OVERLAYS --- */}
      {hasProvoke && <div className="absolute inset-0 rounded-md shadow-[0_0_12px_4px] shadow-amber-500/80 pointer-events-none" />}
      {hasDivineShield && <div className="absolute inset-0 rounded-full scale-110 blur-sm bg-yellow-300 opacity-50 animate-pulse pointer-events-none" />}
      {isStunnedOrFrozen && <div className="absolute inset-0 bg-cyan-400 bg-opacity-40 rounded-md pointer-events-none ring-2 ring-cyan-200 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.335 3.337A1 1 0 004 4.333v11.334a1 1 0 001.335.966l8.667-5.667a1 1 0 000-1.932L5.335 3.337z" clipRule="evenodd" transform="rotate(90 10 10)" /></svg></div>}
      {isPoisoned && <div className="absolute inset-0 bg-green-700 bg-opacity-40 rounded-md pointer-events-none ring-2 ring-green-400 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></div>}
      {isSilenced && <div className="absolute inset-0 bg-purple-700 bg-opacity-40 rounded-md pointer-events-none ring-2 ring-purple-400 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0L19.07 5.929a1 1 0 01-1.414 1.414L15 4.757l-2.657 2.657a1 1 0 01-1.414-1.414L13.586 3.343l-2.657-2.657a1 1 0 010-1.414l.004-.004a1 1 0 011.41 0l2.661 2.661z" clipRule="evenodd" /></svg></div>}
      {hasStealth && <div className="absolute inset-0 bg-purple-900 bg-opacity-50 rounded-md pointer-events-none ring-1 ring-purple-400 opacity-80" />}
      {isEnraged && unit.currentHealth < unit.maxHealth && <div className="absolute inset-0 rounded-md shadow-[0_0_15px_5px] shadow-red-600/90 pointer-events-none animate-pulse" />}
      {unit.souls > 0 && <div className="absolute inset-0 rounded-md shadow-[0_0_15px_5px] shadow-purple-600/90 pointer-events-none animate-pulse" title={`Поглощено душ: ${unit.souls}`} />}


      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/80 transition-colors duration-200 z-10 p-1 overflow-hidden">
        <p className="font-bold text-white text-[10px] leading-tight">{unit.card.name}</p>
        <p className="text-gray-300 text-[7px] leading-[.9] mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-normal">{abilityText}</p>
      </div>

      <img src={unit.card.artUrl} alt={unit.card.name} className="absolute inset-0 w-full h-full object-cover rounded pixelated opacity-40" />
      
      {/* --- ABILITY ICONS --- */}
      <div className="absolute top-1 right-1 z-20 flex flex-col gap-1">
        {armor > 0 && 
            <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center border-2 border-gray-400" title={`Броня: ${armor}`}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"></path></svg>
            </div>
        }
        {regeneration > 0 && 
            <div className="w-5 h-5 bg-green-700 rounded-full flex items-center justify-center border-2 border-green-400" title={`Регенерация: ${regeneration}`}>
                <span className="font-bold text-white text-xs">+</span>
            </div>
        }
      </div>

      <div className="absolute bottom-1 left-1 right-1 z-20">
        <div className="relative w-full h-3 bg-red-800 border border-black rounded-sm overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-red-500" style={{ width: `${healthPercentage}%` }}/>
          <span className="absolute inset-0 text-white font-bold text-[9px] leading-3 flex items-center justify-center mix-blend-difference">{unit.currentHealth}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className={`text-white w-6 h-6 flex items-center justify-center rounded-full border-2 border-black text-sm font-bold ${totalAttack > unit.card.attack ? 'bg-green-600' : 'bg-blue-600'}`}>{totalAttack}</span>
        </div>
      </div>
    </div>
  );
};