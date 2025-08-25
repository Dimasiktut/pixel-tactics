import React from 'react';
import type { PlayerID } from '../types';
import { PLAYER1_NAME, PLAYER2_NAME } from '../constants';

interface WinnerModalProps {
  winner: PlayerID;
  onRestart: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ winner, onRestart }) => {
  const winnerName = winner === 'Player1' ? PLAYER1_NAME : PLAYER2_NAME;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 border-4 border-yellow-400 rounded-lg p-8 text-center shadow-2xl animate-pop-in">
        <h2 className="text-4xl font-bold mb-4 text-yellow-300">Победа!</h2>
        <p className="text-xl mb-8">{winnerName} побеждает!</p>
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-md hover:bg-green-500 transition-colors border-b-4 border-green-800 active:border-b-0"
        >
          Сыграть снова
        </button>
      </div>
      <style>{`
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-pop-in {
          animation: pop-in 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
        }
      `}</style>
    </div>
  );
};
