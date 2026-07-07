'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientGameEvent,
  ClientGameState,
  ClientMessage,
  LobbyPlayer,
  ServerMessage,
  Team,
} from 'shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';
const STORAGE_ROOM_ID = 'cardBattle_roomId';
const STORAGE_PLAYER_ID = 'cardBattle_playerId';

export interface UseWebSocketReturn {
  connected: boolean;
  roomId: string | null;
  playerId: string | null;
  lobbyPlayers: LobbyPlayer[];
  gameState: ClientGameState | null;
  lastEvents: ClientGameEvent[];
  error: string | null;
  createRoom: (nickname: string, team: Team) => void;
  joinRoom: (roomId: string, nickname: string, team: Team) => void;
  sendReady: () => void;
  openCard: (r: number, c: number) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [lastEvents, setLastEvents] = useState<ClientGameEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);

      // 저장된 세션 정보로 자동 재접속 시도
      const savedRoomId = localStorage.getItem(STORAGE_ROOM_ID);
      const savedPlayerId = localStorage.getItem(STORAGE_PLAYER_ID);
      if (savedRoomId && savedPlayerId) {
        ws.send(JSON.stringify({ type: 'reconnect', roomId: savedRoomId, playerId: savedPlayerId }));
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setError('서버에 연결할 수 없습니다.');
    };

    ws.onmessage = (e: MessageEvent) => {
      const msg: ServerMessage = JSON.parse(e.data as string);

      switch (msg.type) {
        case 'roomCreated':
        case 'roomJoined':
          setRoomId(msg.roomId);
          setPlayerId(msg.playerId);
          localStorage.setItem(STORAGE_ROOM_ID, msg.roomId);
          localStorage.setItem(STORAGE_PLAYER_ID, msg.playerId);
          break;

        case 'lobbyState':
          setLobbyPlayers(msg.players);
          break;

        case 'gameStart':
        case 'gameSnapshot':
          setGameState(msg.state);
          setLobbyPlayers([]);
          break;

        case 'actionResult':
          setLastEvents(msg.events);
          setGameState(msg.state);
          break;

        case 'error':
          if (msg.code === 'INVALID_RECONNECT') {
            // 재접속 실패: 저장된 세션 정보 제거
            localStorage.removeItem(STORAGE_ROOM_ID);
            localStorage.removeItem(STORAGE_PLAYER_ID);
          }
          setError(msg.message);
          break;
      }
    };

    return () => ws.close();
  }, []);

  const createRoom = useCallback((nickname: string, team: Team) => {
    setError(null);
    send({ type: 'createRoom', nickname, team });
  }, [send]);

  const joinRoom = useCallback((rid: string, nickname: string, team: Team) => {
    setError(null);
    send({ type: 'joinRoom', roomId: rid, nickname, team });
  }, [send]);

  const sendReady = useCallback(() => send({ type: 'ready' }), [send]);

  const openCard = useCallback((r: number, c: number) => {
    send({ type: 'openCard', r, c });
  }, [send]);

  return {
    connected, roomId, playerId,
    lobbyPlayers, gameState, lastEvents, error,
    createRoom, joinRoom, sendReady, openCard,
  };
}
