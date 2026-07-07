'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LobbyPlayer, Team } from 'shared';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function LobbyPage() {
  const router = useRouter();
  const ws = useWebSocket();

  const [nickname, setNickname] = useState('');
  const [team, setTeam] = useState<Team>('A');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'waiting'>('home');
  const [isReady, setIsReady] = useState(false);

  // 방 입장 감지
  useEffect(() => {
    if (ws.roomId && mode !== 'waiting') setMode('waiting');
  }, [ws.roomId, mode]);

  // 게임 시작 감지 → 게임 화면으로 이동
  useEffect(() => {
    if (ws.gameState && ws.roomId) {
      router.push(`/room/${ws.roomId}`);
    }
  }, [ws.gameState, ws.roomId, router]);

  const handleCreateRoom = () => {
    if (!nickname.trim()) return;
    ws.createRoom(nickname.trim(), team);
  };

  const handleJoinRoom = () => {
    if (!nickname.trim() || !joinRoomId.trim()) return;
    ws.joinRoom(joinRoomId.trim().toUpperCase(), nickname.trim(), team);
  };

  const handleReady = () => {
    ws.sendReady();
    setIsReady(true);
  };

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl mb-2">🐑🐰🧜‍♀️🐯</h1>
      <h2 className="text-xl font-semibold text-green-800 mb-8">한국특허정보원 카드배틀</h2>

      {!ws.connected && (
        <p className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm">
          서버에 연결 중...
        </p>
      )}

      {ws.error && (
        <p className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
          {ws.error}
        </p>
      )}

      {mode === 'home' && (
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={() => setMode('create')}
            disabled={!ws.connected}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition"
          >
            방 만들기
          </button>
          <button
            onClick={() => setMode('join')}
            disabled={!ws.connected}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition"
          >
            방 참가하기
          </button>
        </div>
      )}

      {(mode === 'create' || mode === 'join') && (
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4">
          <h3 className="font-semibold text-gray-700">
            {mode === 'create' ? '방 만들기' : '방 참가하기'}
          </h3>

          <Field label="닉네임">
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="닉네임 입력"
              maxLength={12}
              className="input-base"
            />
          </Field>

          {mode === 'join' && (
            <Field label="방 코드">
              <input
                type="text"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="예: ABCD"
                maxLength={4}
                className="input-base font-mono tracking-widest"
              />
            </Field>
          )}

          <Field label="팀 선택">
            <div className="flex gap-2">
              {(['A', 'B'] as Team[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTeam(t)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                    team === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'A' ? '🟢 A팀' : '🔵 B팀'}
                </button>
              ))}
            </div>
          </Field>

          <button
            onClick={mode === 'create' ? handleCreateRoom : handleJoinRoom}
            disabled={!ws.connected || !nickname.trim() || (mode === 'join' && !joinRoomId.trim())}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition"
          >
            {mode === 'create' ? '방 만들기' : '입장하기'}
          </button>

          <button onClick={() => setMode('home')} className="text-sm text-gray-400 hover:text-gray-600">
            ← 뒤로
          </button>
        </div>
      )}

      {mode === 'waiting' && ws.roomId && (
        <WaitingRoom
          roomId={ws.roomId}
          players={ws.lobbyPlayers}
          isReady={isReady}
          onReady={handleReady}
        />
      )}

      <style>{`
        .input-base {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          color: #1f2937;
          outline: none;
        }
        .input-base:focus { box-shadow: 0 0 0 2px #4ade80; border-color: transparent; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function WaitingRoom({
  roomId, players, isReady, onReady,
}: {
  roomId: string;
  players: LobbyPlayer[];
  isReady: boolean;
  onReady: () => void;
}) {
  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');
  const canStart = players.length >= 2 && players.every(p => p.ready) && teamA.length > 0 && teamB.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col gap-5">
      <div className="text-center">
        <p className="text-sm text-gray-400">방 코드</p>
        <p className="text-4xl font-mono font-bold text-green-700 tracking-widest">{roomId}</p>
        <p className="text-xs text-gray-400 mt-1">친구에게 이 코드를 알려주세요</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TeamColumn label="🟢 A팀" players={teamA} />
        <TeamColumn label="🔵 B팀" players={teamB} />
      </div>

      {canStart ? (
        <p className="text-center text-green-600 font-semibold animate-pulse">게임 시작 중...</p>
      ) : (
        <button
          onClick={onReady}
          disabled={isReady}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition"
        >
          {isReady ? '준비 완료 ✓' : '준비'}
        </button>
      )}
    </div>
  );
}

function TeamColumn({ label, players }: { label: string; players: LobbyPlayer[] }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 min-h-[80px]">
      <p className="font-semibold text-gray-700 text-sm mb-2">{label}</p>
      {players.length === 0 ? (
        <p className="text-xs text-gray-400">없음</p>
      ) : (
        players.map(p => (
          <div key={p.nickname} className="flex items-center gap-2 text-sm py-0.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${p.ready ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-700 truncate">{p.nickname}</span>
          </div>
        ))
      )}
    </div>
  );
}
