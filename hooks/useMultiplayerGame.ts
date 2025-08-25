import { useReducer, useRef, useState, useEffect, useCallback } from 'react';
import { gameReducer, createInitialState } from '../game/reducer';
import { PlayerID } from '../types';
import type { GameAction, NetworkMessage, FullGameState, CardData } from '../types';
import { staticDeck } from '../services/staticCardData';

type GameScreen = 'loading' | 'menu' | 'lobby' | 'game';

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

    const dispatchNetworked = (action: GameAction) => {
        if (!channelRef.current) {
            console.error("Канал для отправки действий не найден.");
            return;
        }
        
        if (action.type === 'REQUEST_RESTART') {
            const message: NetworkMessage = { type: 'RESTART_REQUEST' };
            channelRef.current.postMessage(message);
        } else {
            const message: NetworkMessage = { type: 'ACTION', payload: action };
            channelRef.current.postMessage(message);
        }
    }
    
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
                if (localPlayerId === PlayerID.Player1 && generatedDeckRef.current) {
                    console.log('Запрошен реванш. Создание новой игры.');
                    // For simplicity, we reuse the same deck for the rematch.
                    const setupAction: GameAction = { type: 'SETUP_GAME', payload: { deck: generatedDeckRef.current } };
                    const newGameState = gameReducer(createInitialState(), setupAction);
                    
                    const startMessage: NetworkMessage = { type: 'GAME_START', payload: { state: newGameState } };
                    channelRef.current?.postMessage(startMessage);
                }
                break;
            case 'ACTION':
                dispatch(message.payload);
                break;
        }
    }, [localPlayerId, screen]);

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

    const createGame = useCallback(() => {
        setError(null);
        setScreen('loading');

        generatedDeckRef.current = staticDeck;

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
        screen,
        roomId,
        localPlayerId,
        error,
    };
};