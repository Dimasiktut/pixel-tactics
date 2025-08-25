import React from 'react';

interface LobbyScreenProps {
  roomId: string;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ roomId }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomId);
    // Optionally, show a "Copied!" message
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white text-center p-4">
        <h1 className="text-3xl sm:text-4xl mb-4 font-bold text-yellow-300">Лобби Игры</h1>
        <p className="text-lg text-gray-300 mb-8">Отправьте этот код второму игроку для подключения:</p>
        
        <div 
            className="bg-gray-800 border-2 border-gray-600 rounded-md px-8 py-4 text-4xl font-bold tracking-[.3em] text-white mb-8 cursor-pointer hover:bg-gray-700"
            onClick={copyToClipboard}
            title="Нажмите, чтобы скопировать"
        >
            {roomId}
        </div>

        <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-yellow-400 rounded-full animate-spin border-t-transparent"></div>
            <p className="text-xl text-gray-400">Ожидание второго игрока...</p>
        </div>
    </div>
  );
};
