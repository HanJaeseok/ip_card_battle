'use client';

import type { Animal, ClientGameState, Team } from 'shared';
import { previewSkill } from '@/lib/skills';

const ANIMAL_ORDER: Animal[] = ['sheep', 'rabbit', 'mermaid', 'tiger'];

const SKILL_TITLE: Record<Animal, string> = {
  sheep: '실용신양',
  rabbit: '상표토끼',
  mermaid: '디자인어',
  tiger: '특허랑이',
};

const SKILL_COLOR: Record<Animal, string> = {
  sheep: '#84cc16',
  rabbit: '#ec4899',
  mermaid: '#3b82f6',
  tiger: '#f97316',
};

function describeSkill(animal: Animal, level: number): string {
  switch (animal) {
    case 'sheep':
      return `놀라운 기술로 다음 턴에 카드를 ${level}회 더 뽑습니다.`;
    case 'rabbit':
      return `영향력을 확장합니다. 현재 내 점수 +5×${level}%`;
    case 'mermaid':
      return `상대를 벤치마킹합니다. 상대와의 점수 차이의 5×${level}%만큼 획득합니다.`;
    case 'tiger':
      return `독점권을 발동합니다. 상대의 점수 5×${level}%만큼 감소시킵니다.`;
  }
}

export function SkillChoiceModal({
  gameState,
  team,
  onChoose,
}: {
  gameState: ClientGameState;
  team: Team;
  onChoose: (animal: Animal) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4">
      <div className="bg-jungle-950 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">
        <div className="text-center pt-5 pb-3">
          <h2 className="skill-outline-text text-2xl font-black text-white">턴을 마치며 — 스킬을 하나 선택하세요</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x-0 sm:divide-x-2 divide-y-2 sm:divide-y-0 divide-jungle-700">
          {ANIMAL_ORDER.map(animal => {
            const preview = previewSkill(gameState, team, animal);
            const hasEffect = preview.myScoreDelta > 0 || preview.oppScoreDelta > 0 || preview.extraDraws > 0;

            return (
              <button
                key={animal}
                onClick={() => onChoose(animal)}
                className="skill-choice-panel group relative flex flex-col items-stretch justify-end min-h-[360px] text-left"
                style={{ backgroundImage: `url(/skills/${animal}_skill.png)` }}
              >
                <div className="skill-choice-dim absolute inset-0" />
                <div className="relative z-10 flex flex-col gap-2 p-4">
                  <h3
                    className="skill-outline-text text-xl font-extrabold"
                    style={{ color: SKILL_COLOR[animal] }}
                  >
                    &lt;{SKILL_TITLE[animal]}&gt;
                  </h3>
                  <p className="skill-outline-text text-sm text-white leading-relaxed">
                    {describeSkill(animal, preview.level)}
                  </p>
                  <p className={`skill-outline-text text-base font-bold ${hasEffect ? 'text-amber-300' : 'text-gray-300'}`}>
                    {preview.extraDraws > 0 && `다음 턴 카드 +${preview.extraDraws}회`}
                    {preview.myScoreDelta > 0 && `내 점수 +${preview.myScoreDelta}점`}
                    {preview.oppScoreDelta > 0 && `상대 점수 -${preview.oppScoreDelta}점`}
                    {!hasEffect && '아직 레벨 0 (효과 없음)'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
