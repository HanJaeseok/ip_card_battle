'use client';

import { MAX_TURN, FESTIVAL_TURN, INITIAL_HP, WIN_HP, PLACES } from 'shared';
import { PLACE_NAME, placeAnimalLabel } from '@/lib/places';
import type { Place } from 'shared';

function MiniPlace({ place }: { place: Place }) {
  return (
    <div
      className="w-20 h-14 rounded-lg bg-cover bg-center relative overflow-hidden shrink-0 border border-black/10"
      style={{ backgroundImage: `url(/places/${place}.png)` }}
    >
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
        <p className="text-white text-[0.65rem] font-bold leading-tight">{PLACE_NAME[place]}</p>
        <p className="text-white/90 text-[0.6rem] leading-tight">{placeAnimalLabel(place)}</p>
      </div>
    </div>
  );
}

// 동물 점수판의 실제 모습(점수 + 경험치 바 + 레벨)을 축소 재연
function MiniLevelBar({ emoji, score, threshold }: { emoji: string; score: number; threshold: number }) {
  const level = Math.floor(score / threshold);
  const pct = ((score % threshold) / threshold) * 100;
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-28">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-lg leading-none">{emoji}</span>
        <span className="text-sm font-extrabold text-jungle-900">{score}</span>
      </div>
      <div className="px-2 pb-1">
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-jungle-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[0.6rem] text-jungle-500 text-right font-bold">Lv. {level}</p>
      </div>
    </div>
  );
}

// 중앙 동물 스택의 실제 모습(카드가 반쯤 겹쳐 쌓이고, 옆에 총합 숫자가 크게 표시)을 축소 재연
function MiniStackRow({ emoji, nums, total }: { emoji: string; nums: number[]; total: number }) {
  return (
    <div className="relative flex items-center gap-2 bg-white rounded-lg border border-jungle-200 px-3 py-2 overflow-hidden">
      <span className="text-2xl font-black text-jungle-900 tabular-nums w-8 text-center shrink-0">{total}</span>
      <div className="flex items-center">
        {nums.map((n, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center w-9 h-12 rounded-md bg-white border border-gray-300 shrink-0"
            style={{ marginLeft: i === 0 ? 0 : -14, zIndex: i }}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="text-xs font-black text-jungle-900">{n}</span>
          </div>
        ))}
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
          {/* 내 차례 확인하기 */}
          <Section
            emoji="🚦"
            title="지금 누구 차례인지 색으로 바로 알 수 있어요"
            visual={
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-24 h-14 rounded-lg bg-lime-100 border-2 border-lime-300 flex items-center justify-center text-xs font-bold text-lime-800">
                    내 차례
                  </div>
                  <span className="text-[0.65rem] text-gray-500">연두색 배경</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-24 h-14 rounded-lg bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-xs font-bold text-rose-800">
                    상대 차례
                  </div>
                  <span className="text-[0.65rem] text-gray-500">연핑크 배경</span>
                </div>
              </>
            }
          >
            내 차례에는 양쪽 팀 영역 배경이 <b>연두색</b>으로, 상대 차례에는 <b>연핑크색</b>으로
            바뀝니다. 카드판 테두리도 내 차례일 때만 하얗게 번쩍이고, 중앙 동물 스택 배경의
            동물 얼굴도 내 차례엔 <b>웃는 얼굴(happy)</b>, 상대 차례엔 <b>골똘한 얼굴(focus)</b>로
            바뀌어요. 화면 어디를 보더라도 지금이 누구 차례인지 헷갈릴 일이 없습니다.
          </Section>

          {/* 장소와 뽑기 */}
          <Section
            emoji="🗺️"
            title="네 장소 중 한 곳을 클릭해 카드를 뽑으세요"
            visual={
              <>
                {PLACES.map(p => (
                  <MiniPlace key={p} place={p} />
                ))}
              </>
            }
          >
            맵 네 모서리에는 오두막·숲길·부둣가·강가가 있고, 각 장소마다 나올 수 있는
            동물이 정해져 있습니다. 장소를 클릭하면 슬롯머신처럼 동물과 숫자가 빠르게
            바뀌다가 하나로 확정되어 중앙의 그 동물 스택으로 날아갑니다. 동물이 3종류인
            장소(숲길·강가)는 숫자 5~9가, 2종류인 장소(오두막·부둣가)는 숫자 1~5가 나옵니다.
          </Section>

          {/* 획득 규칙 */}
          <Section
            emoji="🃏"
            title="짝수 장이 모이면 경험치를 얻어요 (점수 아님!)"
            visual={<MiniStackRow emoji="🐰" nums={[3, 5]} total={8} />}
          >
            중앙 스택에 같은 동물 카드가 <b>짝수 장</b> 쌓이면 그 자리에서 전부 획득하고,
            숫자를 모두 합한 만큼 그 동물의 <b>경험치</b>가 오릅니다(왼쪽의 큰 숫자가 지금
            획득 시 받을 경험치예요). 이 경험치는 <b>점수(=체력)가 아니라</b> 아래에서
            설명할 <b>레벨</b>을 올리는 재료일 뿐입니다 — 체력은 오직 행동으로만 움직여요.
            정산은 이번 차례에 뽑을 카드를 <b>모두 뽑은 뒤</b>에 한 번에, 항상{' '}
            <b>양 → 상표토끼 → 특허랑이 → 디자인어</b> 순서로 이루어집니다.
          </Section>

          {/* 경험치와 레벨 */}
          <Section
            emoji="📈"
            title="쌓인 경험치만큼 레벨이 올라요"
            visual={
              <>
                <MiniLevelBar emoji="🐑" score={25} threshold={10} />
                <MiniLevelBar emoji="🐰" score={7} threshold={10} />
                <MiniLevelBar emoji="🧜‍♀️" score={41} threshold={20} />
                <MiniLevelBar emoji="🐯" score={20} threshold={20} />
              </>
            }
          >
            <b>실용신양·상표토끼는 경험치 10마다, 디자인어·특허랑이는 20마다</b> 레벨이
            1씩 오르고, 프로필 아래 "Lv. N"으로 표시됩니다. 이 레벨이 턴을 마칠 때 고르는
            행동의 위력을 결정합니다.
          </Section>

          {/* 턴 종료 행동 선택 */}
          <Section emoji="✨" title="내 턴이 끝나면, 행동 하나를 고르세요">
            카드를 뽑고 정산까지 끝나면 화면 아래 행동 선택 영역이 활성화됩니다. 네 동물 중
            <b> 딱 하나</b>를 골라야 비로소 턴이 상대에게 넘어갑니다. 효과는 그 동물의{' '}
            <b>레벨 × 대기 배율</b>에 비례합니다.
            <br /><br />
            <b>🐑 실용신양</b> — 다음 턴에 카드를 (레벨×배율)회 더 뽑습니다.<br />
            <b>🐰 상표토끼</b> — 내 체력이 (레벨×배율)만큼 오릅니다.<br />
            <b>🧜‍♀️ 디자인어</b> — 즉시 효과는 없지만, 대기 배율에 <b>2<sup>레벨</sup></b>을 곱합니다.
            스스로는 배율을 쓰지 않고 계속 쌓이므로, 여러 번 연달아 고르면 배율이 눈덩이처럼
            불어납니다(예: 레벨 2를 두 번 고르면 ×16).<br />
            <b>🐯 특허랑이</b> — 상대 체력을 (레벨×배율)만큼 강탈합니다(상대 −n, 나 +n).<br /><br />
            디자인어를 제외한 세 행동은 쓰는 순간 대기 배율이 <b>1로 초기화</b>됩니다
            ("다음을 노리기"로 패스해도 배율은 사라지지 않아요). 각 선택지에는 실제로
            계산된 값이 미리 표시됩니다. 레벨이 0인 동물은 골라도 효과가 없고, 고를 수
            있는 행동이 하나도 없으면 5초 뒤 자동으로 "아무것도 하지 않음"이 선택됩니다.
          </Section>

          {/* 축제 */}
          <Section
            emoji="🌰"
            title={`${FESTIVAL_TURN}턴부터는 축제! 페어 경험치가 2배`}
            visual={<span className="text-3xl">🌰🎉🌰</span>}
          >
            {FESTIVAL_TURN}턴이 되면 보드 곳곳에서 도토리가 폭죽처럼 터지며 축제가
            시작됩니다. 이때부터는 <b>모든 페어 정산에서 얻는 경험치가 2배</b>로 붙어
            레벨이 훨씬 빠르게 오르고, 자연히 행동을 쓸 기회도 늘어납니다.
          </Section>

          {/* 게임 종료 */}
          <Section emoji="🏁" title="체력이 승부를 가른다">
            모든 팀은 체력 <b>{INITIAL_HP}</b>에서 시작합니다. 체력이 <b>{WIN_HP} 이상</b>이
            되면 그 즉시 승리, <b>0 이하</b>가 되면 그 즉시 패배 — 매 행동이 곧바로 승부에
            직결됩니다. {MAX_TURN}턴이 지나도 승부가 안 나면 그 시점의 체력이 더 높은 팀이
            승리합니다(동점이면 무승부). 카드 재고나 보충 같은 건 없어요 — 뽑기는 언제나
            무한이니, 경험치를 빠르게 모아 레벨을 올리고 결정적인 순간에 행동을 터뜨리는
            팀이 유리합니다.
          </Section>
        </div>
      </div>
    </div>
  );
}
