'use client';

import { MAX_TURN, EXPAND_TURN, PLACES } from 'shared';
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

// 실제 게임의 예측 게이지 바(SheepOpenBar 등)와 동일한 룩을 그대로 재사용 —
// "현재 카드 획득 +N" 위에 "발동 시 어떻게 되는지"를 큼직하게 보여준다.
function MiniGaugeBar({
  color,
  fillPct,
  boardGain,
  text,
}: {
  color: string;
  fillPct: number;
  boardGain: number;
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
          현재 카드 획득 +{boardGain}
        </p>
        <p className="text-sm font-bold text-white leading-tight">{text}</p>
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
            장소(숲길·강가)는 숫자 1~3이, 2종류인 장소(오두막·부둣가)는 숫자 4~6이 나옵니다.
          </Section>

          {/* 획득 규칙 */}
          <Section
            emoji="🃏"
            title="짝수 장이 모이면 그 순간 획득!"
            visual={<MiniStackRow emoji="🐰" nums={[3, 5]} total={8} />}
          >
            중앙 스택에 같은 동물 카드가 <b>짝수 장</b> 쌓이면 그 자리에서 전부 획득하고,
            숫자를 모두 합한 만큼 점수를 얻습니다(왼쪽의 큰 숫자가 지금 획득 시 받을 점수예요).
            단, 정산은 이번 차례에 뽑을 카드를 <b>모두 뽑은 뒤</b>에 한 번에 이루어집니다 —
            실용신양 효과로 여러 장이 연달아 나와도, 그 카드들이 전부 나온 다음에야 어느
            동물이 짝을 이뤘는지 확인합니다. 정산은 항상 <b>양 → 상표토끼 → 특허랑이 → 디자인어</b>
            순서로, 하나씩 텀을 두고 보여줍니다.
          </Section>

          {/* 실용신양 */}
          <Section
            emoji="🐑"
            title="실용신양 — 점수가 쌓일수록 카드가 저절로 더 나와요"
            visual={<MiniGaugeBar color="bg-lime-600" fillPct={70} boardGain={3} text="🐑 점수 획득시 +2마리 추가 뽑기" />}
          >
            상시로 켜져 있는 효과예요. <b>내 실용신양 점수를 10으로 나눈 몫</b>만큼, 내가
            장소를 클릭할 때마다 양털뭉치가 무작위 장소로 굴러가 카드를 추가로 뽑아옵니다.
            발동하는 순간 화면에 <b>"실용신양의 N번째 힘!"</b>이라는 큰 배너가 뜨니 눈여겨보세요.
            점수가 오르면 다음 차례에 더 많이 뽑히고, 특허랑이에게 점수를 뺏기면 그만큼
            바로 줄어듭니다.
          </Section>

          {/* 상표토끼 */}
          <Section
            emoji="🐰"
            title="상표토끼 — 꾸준히 모으면 보너스"
            visual={<MiniGaugeBar color="bg-pink-500" fillPct={40} boardGain={4} text="🎯 점수 획득시 +8" />}
          >
            내 차례가 끝날 때 상표토끼 점수가 <b>10점 단위 구간을 새로 넘으면</b>, (넘은
            구간 수 × 현재 턴 수)만큼 보너스를 추가로 받습니다. 턴이 늦을수록 한 번에
            받는 보너스가 커집니다.
          </Section>

          {/* 디자인어 */}
          <Section
            emoji="🧜‍♀️"
            title="디자인어 — 뒤처지면 역전, 앞서면 가속"
            visual={<MiniGaugeBar color="bg-blue-600" fillPct={60} boardGain={6} text="🔵 점수 획득시 흡수 +15" />}
          >
            디자인어 점수가 <b>20점 단위 구간을 새로 넘을 때</b> 발동합니다. 전체
            총점이 상대보다 뒤처져 있다면 격차의 50%를 상대에게서 흡수해 오고,
            앞서고 있다면 대신 소량의 보너스를 받습니다.
          </Section>

          {/* 특허랑이 */}
          <Section
            emoji="🐯"
            title="특허랑이 — 상대 점수를 강탈"
            visual={<MiniGaugeBar color="bg-orange-600" fillPct={90} boardGain={5} text="⚔ 점수 획득시 공격력 12" />}
          >
            특허랑이 점수가 <b>20점 단위 구간을 새로 넘을 때</b>, 상대 팀의 실용신양과
            상표토끼 점수를 깎아 빼앗아 옵니다(0 밑으로는 내려가지 않아요). 게이지가
            꽉 찰수록 곧 터진다는 뜻이니 상대 화면을 주시하세요!
          </Section>

          {/* 도토리 폭탄 */}
          <Section
            emoji="🌰"
            title={`${EXPAND_TURN}턴이 지나면 도토리 폭탄이 등장해요`}
            visual={
              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-lg bg-cover bg-center relative overflow-hidden border border-black/10" style={{ backgroundImage: 'url(/places/house.png)' }}>
                  <span className="absolute top-1 right-1 text-lg drop-shadow">🌰</span>
                </div>
                <span className="text-2xl">💥🌰💥</span>
              </div>
            }
          >
            {EXPAND_TURN + 1}턴부터는 카드를 뽑을 때마다 일정 확률로 도토리 폭탄이 터져,
            그 동물의 미획득 스택 전체가 도토리 폭죽과 함께 사라집니다. 확률은{' '}
            {EXPAND_TURN + 1}턴 10%로 시작해 <b>턴이 오를 때마다 5%씩</b> 올라가므로,
            후반으로 갈수록 카드를 오래 묵혀두면 위험합니다. 폭탄이 등장할 수 있는
            장소에는 항상 🌰 표시가 붙어 있어요.
          </Section>

          {/* 게임 종료 */}
          <Section emoji="🏁" title="게임 종료">
            총 {MAX_TURN}턴이 지나면 게임이 종료되고, 4개 동물 점수를 합친 총점이 더 높은
            팀이 승리합니다(동점이면 무승부). 카드 재고나 보충 같은 건 없어요 — 뽑기는
            언제나 무한이니, 시간 안에 최대한 많이 짝을 맞추고 효과를 터뜨리는 팀이 유리합니다.
          </Section>
        </div>
      </div>
    </div>
  );
}
