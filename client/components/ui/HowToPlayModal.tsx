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
          <Section emoji="🃏" title="짝수 장이 모이면 그 순간 획득!">
            중앙 스택에 같은 동물 카드가 <b>짝수 장</b> 쌓이면 그 자리에서 전부 획득하고,
            숫자를 모두 합한 만큼 점수를 얻습니다. 단, 정산은 이번 차례에 뽑을 카드를
            <b> 모두 뽑은 뒤</b>에 한 번에 이루어집니다 — 실용신양 효과로 여러 장이 연달아
            나와도, 그 카드들이 전부 나온 다음에야 어느 동물이 짝을 이뤘는지 확인합니다.
          </Section>

          {/* 실용신양 */}
          <Section
            emoji="🐑"
            title="실용신양 — 점수가 쌓일수록 카드가 저절로 더 나와요"
            visual={<MiniGaugeBar color="bg-lime-600" threshold={10} fraction="7/10" fillPct={70} text="추가 카드 뽑기 +2장" />}
          >
            상시로 켜져 있는 효과예요. <b>내 실용신양 점수를 10으로 나눈 몫</b>만큼, 내가
            장소를 클릭할 때마다 양털뭉치가 무작위 장소로 굴러가 카드를 추가로 뽑아옵니다.
            점수가 오르면 다음 차례에 더 많이 뽑히고, 특허랑이에게 점수를 뺏기면 그만큼
            바로 줄어듭니다.
          </Section>

          {/* 상표토끼 */}
          <Section
            emoji="🐰"
            title="상표토끼 — 꾸준히 모으면 보너스"
            visual={<MiniGaugeBar color="bg-pink-500" threshold={10} fraction="4/10" fillPct={40} text="다음 보너스 +8점" />}
          >
            내 차례가 끝날 때 상표토끼 점수가 <b>10점 단위 구간을 새로 넘으면</b>, (넘은
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

          {/* 카드 보충 & 종료 */}
          <Section emoji="📦" title="카드 보충과 게임 종료">
            {EXPAND_TURN}턴이 끝나면 네 장소의 카드 재고가 한 번 더 보충됩니다. 총{' '}
            {MAX_TURN}턴이 지나거나 모든 카드가 다 뽑히면 게임이 종료되고, 4개 동물
            점수를 합친 총점이 더 높은 팀이 승리합니다(동점이면 무승부).
          </Section>
        </div>
      </div>
    </div>
  );
}
