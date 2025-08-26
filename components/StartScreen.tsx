import React, { useState } from 'react';

interface StartScreenProps {
  onCreateGame: () => void;
  onJoinGame: (roomId: string) => void;
  onStartAIGame: () => void;
  onShowInstructions: () => void;
  error: string | null;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onCreateGame, onJoinGame, onStartAIGame, onShowInstructions, error }) => {
  const [roomId, setRoomId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleJoinClick = () => {
    if (showJoinInput && roomId) {
        onJoinGame(roomId.toUpperCase());
    } else {
        setShowJoinInput(true);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white text-center p-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-4 font-bold tracking-wider text-yellow-300 [text-shadow:_3px_3px_0_rgb(0_0_0)]">
            Пиксельные Тактики: Дуэль
        </h1>
        <p className="text-lg text-gray-300 mb-12 max-w-2xl">
            Соберите свою армию, перехитрите противника и приведите своего лидера к победе в этой тактической карточной дуэли!
        </p>

        {error && <p className="text-red-500 text-lg mb-4">{error}</p>}
        
        {showJoinInput ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                 <input 
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="КОД КОМНАТЫ"
                    maxLength={4}
                    className="px-10 py-5 bg-gray-800 border-2 border-gray-600 text-white font-bold text-xl rounded-md focus:outline-none focus:border-yellow-400 text-center tracking-[.2em] uppercase"
                />
                 <button
                    onClick={handleJoinClick}
                    className="px-10 py-5 bg-blue-600 text-white font-bold text-xl rounded-md hover:bg-blue-500 transition-colors border-b-4 border-blue-800 active:border-b-0 transform hover:scale-105"
                >
                    Присоединиться
                </button>
            </div>
        ) : (
             <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={onStartAIGame}
                    className="px-10 py-5 bg-purple-600 text-white font-bold text-xl rounded-md hover:bg-purple-500 transition-colors border-b-4 border-purple-800 active:border-b-0 transform hover:scale-105"
                >
                    Играть с ИИ
                </button>
                <button
                    onClick={onCreateGame}
                    className="px-10 py-5 bg-green-600 text-white font-bold text-xl rounded-md hover:bg-green-500 transition-colors border-b-4 border-green-800 active:border-b-0 transform hover:scale-105"
                >
                    Создать Игру
                </button>
                <button
                    onClick={handleJoinClick}
                    className="px-10 py-5 bg-blue-600 text-white font-bold text-xl rounded-md hover:bg-blue-500 transition-colors border-b-4 border-blue-800 active:border-b-0 transform hover:scale-105"
                >
                    Присоединиться
                </button>
             </div>
        )}
       
        <button
            onClick={onShowInstructions}
            className="mt-8 px-8 py-4 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-colors border-b-4 border-gray-900 active:border-b-0"
        >
            Инструкция
        </button>
         <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};