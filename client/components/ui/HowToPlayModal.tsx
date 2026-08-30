'use client';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-sm font-bold text-jungle-800">{title}</h4>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
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

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <Section title="🎯 목표">
            총 40턴 동안 카드를 뒤집어 점수를 모읍니다. 게임이 끝났을 때 4개 동물 점수를
            합친 총점이 더 높은 팀이 승리합니다.
          </Section>

          <Section title="🃏 카드와 진행">
            보드에는 🐑실용신양·🐰상표토끼·🧜‍♀️디자인어·🐯특허랑이 4종류 카드가 각각 25장씩
            숫자(1~6)와 함께 뒤집혀 있습니다. 두 팀이 번갈아 자기 차례에 카드를 한 장씩
            뒤집으며(제한시간 30초, 시간 초과 시 무작위 카드가 자동으로 열립니다), 같은
            동물 카드가 보드 위에 <b>짝수 장</b> 뒤집혀 있게 되는 순간 그 카드들을 전부
            획득하고 숫자를 합한 만큼 점수를 얻습니다.
          </Section>

          <Section title="🐑 실용신양 — 질보다 양">
            항상 켜져 있는 효과입니다. 자기 차례마다 <b>(현재 실용신양 점수 ÷ 10, 내림)</b>
            만큼 카드를 추가로 자동으로 열어줍니다. 점수가 오르면 다음 턴에 더 많이
            열리고, 특허랑이에게 점수를 깎이면 그만큼 바로 줄어듭니다.
          </Section>

          <Section title="🐰 상표토끼 — 꾸준함의 보상">
            내 턴이 끝날 때, 상표토끼 점수가 <b>10점 단위 구간을 새로 넘으면</b> (넘은
            구간 수 × 현재 턴 수)만큼 보너스 점수를 추가로 받습니다. 턴이 늦을수록
            보너스가 커집니다.
          </Section>

          <Section title="🧜‍♀️ 디자인어 — 역전 아니면 가속">
            디자인어 점수가 <b>20점 단위 구간을 새로 넘을 때</b> 발동합니다. 전체
            총점이 상대보다 뒤처져 있다면 격차의 50%를 상대에게서 흡수해 옵니다.
            반대로 앞서고 있다면 (넘은 구간 수 × 턴 수 × 0.3)만큼 소량 보너스를 받습니다.
          </Section>

          <Section title="🐯 특허랑이 — 강탈자">
            특허랑이 점수가 <b>20점 단위 구간을 새로 넘을 때</b>, 상대 팀의 실용신양과
            상표토끼 점수를 각각 (넘은 구간 수 × 턴 수 × 1.5)만큼 빼앗아 옵니다
            (0 밑으로는 내려가지 않습니다).
          </Section>

          <Section title="🗺️ 보드 확장 & 종료">
            20턴이 끝나면 보드 테두리에 카드가 추가되어 10×10에서 14×14로 넓어집니다
            (동물별 24장씩 추가). 40턴이 지나거나 모든 카드가 열리면 게임이 종료되고,
            총점이 더 높은 팀이 승리합니다(동점이면 무승부).
          </Section>
        </div>
      </div>
    </div>
  );
}
