import React from 'react';

interface LoadingScreenProps {
  // message?: string | null;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = () => {
  const title = 'Подготовка к битве...';
  const subtitle = 'Герои занимают свои позиции.';

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white text-center p-4">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-400">{subtitle}</p>
    </div>
  );
};