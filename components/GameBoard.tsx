import React, { useState, useEffect, useRef } from 'react';
import type { FullGameState, GameAction, PlayerID } from '../types';
import { PlayerArea } from './PlayerArea';
import { GameLog } from './GameLog';
import { ActionPanel } from './ActionPanel';

interface GameBoardProps {
  state: FullGameState;
  dispatch: React.Dispatch<GameAction>;
  localPlayerId: PlayerID;
  isAIsTurn?: boolean;
}

const TurnIndicator: React.FC<{ playerName: string; isMyTurn: boolean; }> = ({ playerName, isMyTurn }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[100]">
      <div className="turn-indicator-animate bg-black bg-opacity-80 border-4 border-yellow-400 rounded-lg p-8 text-center shadow-2xl">
        <h2 className="text-5xl font-bold text-yellow-300 [text-shadow:_3px_3px_0_rgb(0_0_0)]">
          {isMyTurn ? "Ваш ход!" : "Ход противника"}
        </h2>
        <p className="text-2xl mt-2">{playerName}</p>
      </div>
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ state, dispatch, localPlayerId, isAIsTurn }) => {
  const { game, players, log, selectedCard, selectedUnit } = state;

  const [showTurnIndicator, setShowTurnIndicator] = useState(false);
  const prevPlayerRef = useRef(game.currentPlayer);

  useEffect(() => {
    // Показываем индикатор только при смене игрока, а не при первой загрузке
    if (prevPlayerRef.current !== game.currentPlayer) {
        setShowTurnIndicator(true);
        const timer = setTimeout(() => setShowTurnIndicator(false), 2500); // Соответствует длительности анимации
        prevPlayerRef.current = game.currentPlayer;
        return () => clearTimeout(timer);
    }
  }, [game.currentPlayer]);


  const p1 = players[localPlayerId];
  const p2 = players[localPlayerId === 'Player1' ? 'Player2' : 'Player1'];

  if (!p1 || !p2) return null;

  return (
    <main className="grid grid-cols-1 lg:grid-cols-4 gap-4 max-w-screen-2xl mx-auto">
      {showTurnIndicator && (
        <TurnIndicator
          playerName={players[game.currentPlayer]!.name}
          isMyTurn={game.currentPlayer === localPlayerId}
        />
      )}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Opponent's Area */}
        <PlayerArea
          player={p2}
          isOpponent={true}
          isCurrentPlayer={game.currentPlayer === p2.id}
          isLocalPlayer={false}
          selectedUnit={selectedUnit}
          dispatch={dispatch}
          phase={game.phase}
        />

        {/* Action Panel / Turn Indicator */}
        <ActionPanel
          currentPlayer={players[game.currentPlayer]}
          localPlayerId={localPlayerId}
          onEndTurn={() => dispatch({ type: 'END_TURN' })}
          isAIsTurn={isAIsTurn}
        />

        {/* Your Area */}
        <PlayerArea
          player={p1}
          isOpponent={false}
          isCurrentPlayer={game.currentPlayer === p1.id}
          isLocalPlayer={true}
          selectedCard={selectedCard}
          selectedUnit={selectedUnit}
          dispatch={dispatch}
          phase={game.phase}
        />
      </div>
      <div className="lg:col-span-1">
        <GameLog log={log} />
      </div>
    </main>
  );
};