
import React from 'react';
import type { CardData } from '../types';

interface CardViewProps {
  card: CardData;
  isSelected: boolean;
  onSelect: () => void;
  isPlayable: boolean;
}

export const CardView: React.FC<CardViewProps> = ({ card, isSelected, onSelect, isPlayable }) => {
  const borderClass = isSelected ? 'border-yellow-400 ring-4 ring-yellow-400' : 'border-gray-600';
  const cursorClass = isPlayable ? 'cursor-pointer' : 'cursor-not-allowed';

  return (
    <div
      className={`relative w-24 h-32 bg-gray-800 rounded-md border-2 p-1 flex-shrink-0 text-center text-xs transform hover:scale-105 transition-all duration-200 ${borderClass} ${cursorClass}`}
      onClick={isPlayable ? onSelect : undefined}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <img src={card.artUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover rounded opacity-40 pixelated" />
      <div className="relative z-10 flex flex-col h-full">
        <p className="font-bold text-white text-[10px] leading-tight">{card.name}</p>
        <div className="flex-grow"></div>
        <div className="flex justify-between items-end">
          <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full border-2 border-black text-sm font-bold">{card.attack}</span>
          <span className="bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full border-2 border-black text-sm font-bold">{card.health}</span>
        </div>
      </div>
    </div>
  );
};