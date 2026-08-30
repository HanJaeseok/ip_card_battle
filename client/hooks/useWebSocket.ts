'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Animal,
  ClientGameEvent,
  ClientGameState,
  ClientMessage,
  LobbyPlayer,
  Place,
  ServerMessage,
  Team,
} from 'shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';
const STORAGE_ROOM_ID = 'cardBattle_roomId';
const STORAGE_PLAYER_ID = 'cardBattle_playerId';

// localStorage는 같은 브라우저의 모든 탭이 공유해, 한 브라우저로 두 탭을 열어
// 1:1 테스트를 하면 두 탭이 서로의 방/플레이어 세션을 덮어써 버린다.
// sessionStorage는 탭 단위로 격리되어 있어 각 탭이 독립된 세션을 유지하면서도,
// 같은 탭 안에서의 페이지 이동(로비 → 게임 화면)에는 그대로 값이 남아 재접속에 쓸 수 있다.
const sessionStore = {
  get: (key: string) => (typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)),
  set: (key: string, value: string) => window.sessionStorage.setItem(key, value),
  remove: (key: string) => window.sessionStorage.removeItem(key),
};

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
  createSoloRoom: (nickname: string) => void;
  sendReady: () => void;
  drawCard: (place: Place) => void;
  chooseSkill: (animal: Animal) => void;
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
      const savedRoomId = sessionStore.get(STORAGE_ROOM_ID);
      const savedPlayerId = sessionStore.get(STORAGE_PLAYER_ID);
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
          sessionStore.set(STORAGE_ROOM_ID, msg.roomId);
          sessionStore.set(STORAGE_PLAYER_ID, msg.playerId);
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
          if (msg.code === 'INVALID_RECONNECT' || msg.code === 'ROOM_NOT_FOUND') {
            // 재접속 실패(세션 무효 또는 방 소멸): 저장된 세션 정보를 지워서
            // 다음 접속부터는 죽은 방으로 재접속을 반복 시도하지 않게 한다.
            sessionStore.remove(STORAGE_ROOM_ID);
            sessionStore.remove(STORAGE_PLAYER_ID);
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

  const createSoloRoom = useCallback((nickname: string) => {
    setError(null);
    send({ type: 'createSoloRoom', nickname });
  }, [send]);

  const sendReady = useCallback(() => send({ type: 'ready' }), [send]);

  const drawCard = useCallback((place: Place) => {
    send({ type: 'drawCard', place });
  }, [send]);

  const chooseSkill = useCallback((animal: Animal) => {
    send({ type: 'chooseSkill', animal });
  }, [send]);

  return {
    connected, roomId, playerId,
    lobbyPlayers, gameState, lastEvents, error,
    createRoom, joinRoom, createSoloRoom, sendReady, drawCard, chooseSkill,
  };
}
