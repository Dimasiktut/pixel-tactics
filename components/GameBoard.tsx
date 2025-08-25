import React from 'react';
import type { FullGameState, GameAction, PlayerID } from '../types';
import { PlayerArea } from './PlayerArea';
import { GameLog } from './GameLog';
import { ActionPanel } from './ActionPanel';

interface GameBoardProps {
  state: FullGameState;
  dispatch: React.Dispatch<GameAction>;
  localPlayerId: PlayerID;
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, dispatch, localPlayerId }) => {
  const { game, players, log, selectedCard, selectedUnit } = state;

  const p1 = players[localPlayerId];
  const p2 = players[localPlayerId === 'Player1' ? 'Player2' : 'Player1'];

  if (!p1 || !p2) return null;

  return (
    <main className="grid grid-cols-1 lg:grid-cols-4 gap-4 max-w-screen-2xl mx-auto">
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
