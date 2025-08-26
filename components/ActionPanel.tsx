import React from 'react';
import type { Player, PlayerID } from '../types';

interface ActionPanelProps {
  currentPlayer: Player | null;
  localPlayerId: PlayerID;
  onEndTurn: () => void;
  isAIsTurn?: boolean;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ currentPlayer, localPlayerId, onEndTurn, isAIsTurn }) => {
  if (!currentPlayer) return null;
  
  const isMyTurn = currentPlayer.id === localPlayerId;

  if (isAIsTurn) {
    return (
      <div className="flex justify-center items-center bg-black bg-opacity-50 p-2 md:p-3 rounded-lg border border-gray-700 my-2 h-[68px]">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-yellow-400 rounded-full animate-spin border-t-transparent"></div>
          <p className="font-bold text-lg text-yellow-300">ИИ думает...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center bg-black bg-opacity-50 p-2 md:p-3 rounded-lg border border-gray-700 my-2">
      <div className="text-center">
        <p className="text-gray-400 text-xs">Текущий ход</p>
        <p className="font-bold text-lg text-yellow-300">{currentPlayer.name}</p>
      </div>
      <div className='text-center'>
        <p className="text-gray-400 text-xs">Осталось действий</p>
        <p className="font-bold text-2xl">{currentPlayer.actions}</p>
      </div>
      <button
        onClick={onEndTurn}
        disabled={!isMyTurn}
        className="px-4 py-2 md:px-6 md:py-3 bg-red-700 text-white font-bold rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed border-b-4 border-red-900 active:border-b-0"
      >
        Завершить ход
      </button>
    </div>
  );
};