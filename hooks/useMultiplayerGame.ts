import { useReducer, useRef, useState, useEffect, useCallback } from 'react';
import { gameReducer, createInitialState } from '../game/reducer';
import { PlayerID, GamePhase } from '../types';
import type { GameAction, NetworkMessage, FullGameState, CardData } from '../types';
import { staticDeck } from '../services/staticCardData';
import { getAIMove } from '../services/aiService';

type GameScreen = 'loading' | 'menu' | 'lobby' | 'game';
type GameMode = 'ai' | 'multiplayer' | null;

const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export const useMultiplayerGame = () => {
    const [state, dispatch] = useReducer(gameReducer, createInitialState());
    const [screen, setScreen] = useState<GameScreen>('menu');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [localPlayerId, setLocalPlayerId] = useState<PlayerID | null>(null);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const generatedDeckRef = useRef<CardData[] | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>(null);
    const [isAIsTurn, setIsAIsTurn] = useState(false);

    useEffect(() => {
        // Инициализируем колоду один раз при монтировании
        if (!generatedDeckRef.current) {
            generatedDeckRef.current = staticDeck;
        }
    }, []);

    const hostRestartGame = useCallback(() => {
        // Only the host (Player 1) can initiate the restart sequence.
        if (localPlayerId === PlayerID.Player1 && generatedDeckRef.current) {
            console.log('Инициация перезапуска игры...');
            const setupAction: GameAction = { type: 'SETUP_GAME', payload: { deck: generatedDeckRef.current } };
            const newGameState = gameReducer(createInitialState(), setupAction);
            
            const startMessage: NetworkMessage = { type: 'GAME_START', payload: { state: newGameState } };
            channelRef.current?.postMessage(startMessage);
            
            // Host also needs to update their own state, as they won't receive their own GAME_START message.
            dispatch({ type: 'SET_FULL_STATE', payload: newGameState });
        }
    }, [localPlayerId]);
    
    const handleMessage = useCallback((event: MessageEvent<NetworkMessage>) => {
        const message = event.data;
        console.log('Получено сообщение:', message);

        switch(message.type) {
            case 'JOIN_REQUEST':
                if (localPlayerId === PlayerID.Player1 && generatedDeckRef.current) {
                    console.log('Игрок 2 присоединился. Начинаем игру.');
                    const setupAction: GameAction = { type: 'SETUP_GAME', payload: { deck: generatedDeckRef.current } };
                    const initialState = gameReducer(createInitialState(), setupAction);
                    
                    const startMessage: NetworkMessage = { type: 'GAME_START', payload: { state: initialState } };
                    channelRef.current?.postMessage(startMessage);

                    dispatch({ type: 'SET_FULL_STATE', payload: initialState });
                    setScreen('game');
                }
                break;
            case 'GAME_START':
                console.log('Синхронизация с новым состоянием игры.');
                dispatch({ type: 'SET_FULL_STATE', payload: message.payload.state });
                if (screen !== 'game') {
                    setScreen('game');
                }
                break;
            case 'RESTART_REQUEST':
                // When Player 2 requests a restart, the host handles it.
                hostRestartGame();
                break;
            case 'ACTION':
                dispatch(message.payload);
                break;
        }
    }, [localPlayerId, screen, hostRestartGame]);

    const dispatchNetworked = (action: GameAction) => {
        dispatch(action);

        if (action.type === 'REQUEST_RESTART') {
            if (gameMode === 'ai') {
                const setupAction: GameAction = { type: 'SETUP_GAME', payload: { deck: generatedDeckRef.current! } };
                const newGameState = gameReducer(createInitialState(), setupAction);
                 // Rename Player 2 to AI
                newGameState.players.Player2!.name = "ИИ-Соперник";
                dispatch({ type: 'SET_FULL_STATE', payload: newGameState });
            } else {
                const message: NetworkMessage = { type: 'RESTART_REQUEST' };
                channelRef.current?.postMessage(message);
                if (localPlayerId === PlayerID.Player1) {
                    hostRestartGame();
                }
            }
            return;
        }
        
        if (gameMode === 'multiplayer' && channelRef.current && action.type !== 'SET_FULL_STATE') {
            const message: NetworkMessage = { type: 'ACTION', payload: action };
            channelRef.current.postMessage(message);
        }
    }

    useEffect(() => {
        if (channelRef.current) {
            channelRef.current.onmessage = handleMessage;
        }
        return () => {
            if (channelRef.current) {
                channelRef.current.onmessage = null;
            }
        }
    }, [handleMessage]);

    useEffect(() => {
        const isTurnOfAI = gameMode === 'ai' && state.game.currentPlayer === PlayerID.Player2 && state.game.phase !== GamePhase.GAME_OVER;

        if (isTurnOfAI && !isAIsTurn) {
            setIsAIsTurn(true);
            
            const processAIActions = async () => {
                const aiActions = getAIMove(state);
                
                for (const action of aiActions) {
                    await new Promise(resolve => setTimeout(resolve, 800)); // Moves with a small delay
                    dispatch(action);
                }
                
                const lastAction = aiActions[aiActions.length - 1];
                if (!lastAction || lastAction.type !== 'END_TURN') {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    dispatch({ type: 'END_TURN' });
                }
                setIsAIsTurn(false);
            };
            
            setTimeout(() => processAIActions(), 1000);
        }
    }, [state.game.currentPlayer, state.game.phase, gameMode, isAIsTurn, state, dispatch]);

    const startAIGame = useCallback(() => {
        setError(null);
        setGameMode('ai');
        
        const setupAction: GameAction = { type: 'SETUP_GAME', payload: { deck: generatedDeckRef.current! } };
        const initialState = gameReducer(createInitialState(), setupAction);
        
        initialState.players.Player2!.name = "ИИ-Соперник";
        
        dispatch({ type: 'SET_FULL_STATE', payload: initialState });
        setLocalPlayerId(PlayerID.Player1);
        setScreen('game');
    }, []);

    const createGame = useCallback(() => {
        setGameMode('multiplayer');
        setError(null);
        
        const newRoomId = generateRoomId();
        const newChannel = new BroadcastChannel(newRoomId);
        
        channelRef.current = newChannel;
        setRoomId(newRoomId);
        setLocalPlayerId(PlayerID.Player1);
        setScreen('lobby');
        console.log(`Комната создана: ${newRoomId}. Ожидание Игрока 2.`);
    }, []);

    const joinGame = useCallback((id: string) => {
        if (!id || id.length !== 4) {
            setError('Код комнаты должен состоять из 4 символов.');
            return;
        }
        setGameMode('multiplayer');
        setError(null);
        setScreen('loading');
        const newChannel = new BroadcastChannel(id);
        
        setTimeout(() => {
            channelRef.current = newChannel;
            setRoomId(id);
            setLocalPlayerId(PlayerID.Player2);
            console.log(`Попытка присоединиться к комнате: ${id}`);
            
            const joinMessage: NetworkMessage = { type: 'JOIN_REQUEST' };
            newChannel.postMessage(joinMessage);
        }, 200);

    }, []);
    
    return {
        state,
        dispatch: dispatchNetworked,
        createGame,
        joinGame,
        startAIGame,
        screen,
        roomId,
        localPlayerId,
        error,
        isAIsTurn,
    };
};