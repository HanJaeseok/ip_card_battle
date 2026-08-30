'use client';

import { MAX_TURN, EXPAND_TURN, BOARD_INITIAL, BOARD_EXPANDED } from 'shared';

// 실제 게임 카드와 똑같은 스타일로 뒤집기/페어를 재연하는 미니 카드
function MiniCard({
  faceUp,
  emoji,
  num,
  highlight,
}: {
  faceUp: boolean;
  emoji?: string;
  num?: number;
  highlight?: 'gold' | 'gray';
}) {
  if (!faceUp) {
    return (
      <div className="w-11 h-14 rounded-lg border border-gray-300 bg-white shadow-sm flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-gray-700">?</span>
      </div>
    );
  }
  return (
    <div
      className={`w-11 h-14 rounded-lg bg-white shadow-sm flex flex-col items-center justify-center gap-0.5 shrink-0 ${
        highlight === 'gold'
          ? 'border-2 border-amber-400 ring-2 ring-amber-300'
          : 'border border-gray-300'
      }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-sm font-bold text-jungle-800">{num}</span>
    </div>
  );
}

// 실제 게임의 게이지 바(SheepOpenBar 등)와 동일한 룩을 그대로 재사용
function MiniGaugeBar({
  color,
  threshold,
  fraction,
  fillPct,
  text,
}: {
  color: string;
  threshold: number;
  fraction: string;
  fillPct: number;
  text: string;
}) {
  return (
    <div className={`rounded-full shadow-sm overflow-hidden relative ${color}`}>
      <div
        className="absolute inset-y-0 left-0 bg-black/30"
        style={{ width: `${fillPct}%` }}
      />
      <div className="relative text-center py-1 px-3">
        <p className="text-[0.65rem] text-white/80 leading-none mb-0.5">
          {threshold}점마다 · {fraction}
        </p>
        <p className="text-sm font-bold text-white leading-tight">{text}</p>
      </div>
    </div>
  );
}

function Section({
  emoji,
  title,
  children,
  visual,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <div className="bg-jungle-50 border border-jungle-100 rounded-xl p-3.5 flex flex-col gap-2.5">
      <h4 className="text-sm font-bold text-jungle-800 flex items-center gap-1.5">
        <span className="text-base">{emoji}</span>
        {title}
      </h4>
      {visual && <div className="flex items-center justify-center flex-wrap gap-2 py-1">{visual}</div>}
      <p className="text-xs text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-jungle-900">🐑🐰🧜‍♀️🐯 게임 방법</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3 bg-gray-50">
          {/* 카드 뒤집기 & 페어 재연 */}
          <Section
            emoji="🃏"
            title="카드를 뒤집어 같은 동물끼리 짝을 맞추세요"
            visual={
              <>
                <MiniCard faceUp={false} />
                <MiniCard faceUp={false} />
                <span className="text-gray-400 text-lg">→</span>
                <MiniCard faceUp emoji="🐯" num={3} highlight="gold" />
                <MiniCard faceUp emoji="🐯" num={6} highlight="gold" />
                <span className="text-amber-600 font-bold text-sm ml-1">+9점!</span>
              </>
            }
          >
            보드 위에 같은 동물 카드가 <b>짝수 장</b> 뒤집혀 있게 되는 순간 그 카드를 전부
            획득하고, 숫자를 모두 합한 만큼 점수를 얻습니다. 두 팀이 30초 제한시간 안에
            번갈아 한 장씩 뒤집습니다(시간 초과 시 무작위 카드 자동 오픈).
          </Section>

          {/* 실용신양 */}
          <Section
            emoji="🐑"
            title="실용신양 — 점수가 쌓일수록 카드가 저절로 열려요"
            visual={<MiniGaugeBar color="bg-lime-600" threshold={10} fraction="7/10" fillPct={70} text="추가 카드 오픈 +2장" />}
          >
            상시로 켜져 있는 효과예요. <b>내 실용신양 점수를 10으로 나눈 몫</b>만큼 내
            차례마다 카드가 자동으로 더 열립니다 — 그래서 상대는 여러 장을 연달아
            뒤집는데 나는 한 장만 뒤집는 상황이 생길 수 있어요. 점수가 오르면 다음
            턴에 더 많이 열리고, 특허랑이에게 점수를 뺏기면 그만큼 바로 줄어듭니다.
          </Section>

          {/* 상표토끼 */}
          <Section
            emoji="🐰"
            title="상표토끼 — 꾸준히 모으면 보너스"
            visual={<MiniGaugeBar color="bg-pink-500" threshold={10} fraction="4/10" fillPct={40} text="다음 보너스 +8점" />}
          >
            내 턴이 끝날 때 상표토끼 점수가 <b>10점 단위 구간을 새로 넘으면</b>, (넘은
            구간 수 × 현재 턴 수)만큼 보너스를 추가로 받습니다. 턴이 늦을수록 한 번에
            받는 보너스가 커집니다.
          </Section>

          {/* 디자인어 */}
          <Section
            emoji="🧜‍♀️"
            title="디자인어 — 뒤처지면 역전, 앞서면 가속"
            visual={<MiniGaugeBar color="bg-blue-600" threshold={20} fraction="12/20" fillPct={60} text="예상 흡수 +15" />}
          >
            디자인어 점수가 <b>20점 단위 구간을 새로 넘을 때</b> 발동합니다. 전체
            총점이 상대보다 뒤처져 있다면 격차의 50%를 상대에게서 흡수해 오고,
            앞서고 있다면 대신 소량의 보너스를 받습니다.
          </Section>

          {/* 특허랑이 */}
          <Section
            emoji="🐯"
            title="특허랑이 — 상대 점수를 강탈"
            visual={<MiniGaugeBar color="bg-orange-600" threshold={20} fraction="18/20" fillPct={90} text="⚔ 공격력 12 곧 발동!" />}
          >
            특허랑이 점수가 <b>20점 단위 구간을 새로 넘을 때</b>, 상대 팀의 실용신양과
            상표토끼 점수를 깎아 빼앗아 옵니다(0 밑으로는 내려가지 않아요). 게이지가
            꽉 찰수록 곧 터진다는 뜻이니 상대 화면을 주시하세요!
          </Section>

          {/* 보드 확장 & 종료 */}
          <Section emoji="🗺️" title="보드 확장과 게임 종료">
            {EXPAND_TURN}턴이 끝나면 보드 테두리에 카드가 추가되어 {BOARD_INITIAL}×{BOARD_INITIAL}
            판이 {BOARD_EXPANDED}×{BOARD_EXPANDED}로 넓어집니다. 총 {MAX_TURN}턴이 지나거나
            보드의 모든 카드가 열리면 게임이 종료되고, 4개 동물 점수를 합친 총점이 더
            높은 팀이 승리합니다(동점이면 무승부).
          </Section>
        </div>
      </div>
    </div>
  );
}
