import React, { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { LoadingScreen } from './components/LoadingScreen';
import { WinnerModal } from './components/WinnerModal';
import { StartScreen } from './components/StartScreen';
import { InstructionsModal } from './components/InstructionsModal';
import { LobbyScreen } from './components/LobbyScreen';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';
import { GamePhase } from './types';

function App(): React.ReactNode {
  const {
    state,
    dispatch,
    createGame,
    joinGame,
    startAIGame,
    screen,
    roomId,
    localPlayerId,
    error,
    isAIsTurn
  } = useMultiplayerGame();
  
  const [showInstructions, setShowInstructions] = useState(false);

  if (screen === 'loading') {
    return <LoadingScreen />;
  }
  
  if (screen === 'menu') {
    return (
       <>
        <StartScreen 
          onCreateGame={createGame}
          onJoinGame={joinGame}
          onStartAIGame={startAIGame}
          onShowInstructions={() => setShowInstructions(true)}
          error={error}
        />
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      </>
    );
  }

  if (screen === 'lobby') {
    return <LobbyScreen roomId={roomId!} />;
  }

  if (screen === 'game' && state && localPlayerId) {
    return (
      <div className="min-h-screen bg-gray-900 text-sm text-white p-2 sm:p-4 lg:p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 max-w-screen-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-center font-bold tracking-wider text-yellow-300 [text-shadow:_2px_2px_0_rgb(0_0_0)]">
            Пиксельные Тактики: Дуэль
          </h1>
          <button 
              onClick={() => setShowInstructions(true)}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-500 transition-colors border-b-4 border-blue-800 active:border-b-0 text-lg"
              aria-label="Показать инструкцию"
          >
              ?
          </button>
        </div>
        <GameBoard
          state={state}
          dispatch={dispatch}
          localPlayerId={localPlayerId}
          isAIsTurn={isAIsTurn}
        />
        {state.game.winner && (
          <WinnerModal winner={state.game.winner} onRestart={() => dispatch({ type: 'REQUEST_RESTART' })} />
        )}
         {showInstructions && (
          <InstructionsModal onClose={() => setShowInstructions(false)} />
        )}
      </div>
    );
  }

  return <div>Что-то пошло не так. Пожалуйста, обновите страницу.</div>;
}

export default App;