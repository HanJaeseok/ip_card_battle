'use client';

import { useEffect } from 'react';
import type { Animal, ClientGameState, Team } from 'shared';
import { previewSkill, levelOf } from '@/lib/skills';
import { SKILL_TITLE, SKILL_COLOR, describeSkill } from '@/lib/skillInfo';
import { TurnTimer } from './TurnTimer';

const ANIMAL_ORDER: Animal[] = ['sheep', 'rabbit', 'mermaid', 'tiger'];

export function SkillChoiceModal({
  gameState,
  team,
  onChoose,
  onPass,
}: {
  gameState: ClientGameState;
  team: Team;
  onChoose: (animal: Animal) => void;
  onPass: () => void;
}) {
  const eligibleAnimals = ANIMAL_ORDER.filter(a => levelOf(gameState, team, a) > 0);
  const hasAnyEligible = eligibleAnimals.length > 0;

  // 고를 수 있는 동물이 아예 없으면 선택창을 띄울 필요 없이 바로 패스 처리한다.
  useEffect(() => {
    if (!hasAnyEligible) onPass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnyEligible]);

  if (!hasAnyEligible) {
    return (
      <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4">
        <div className="bg-jungle-950 rounded-2xl shadow-2xl px-8 py-10 max-w-md text-center">
          <p className="text-white text-lg font-bold leading-relaxed">
            스킬을 사용하기엔 레벨이 부족합니다.
            <br />
            동물의 경험치를 모아주세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4">
      <div className="bg-jungle-950 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden">
        <div className="text-center pt-5 pb-2 flex flex-col items-center gap-2">
          <h2 className="skill-outline-text text-2xl font-black text-white">턴을 마치며 — 스킬을 하나 선택하세요</h2>
          <div className="w-64">
            <TurnTimer deadline={gameState.turnDeadline} paused={false} />
          </div>
          <p className="text-red-400 text-xs font-bold leading-relaxed px-4">
            &lt;주의&gt; 레벨 초기화
            <br />
            IP 선택시 에너지를 모두 소모합니다!
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x-0 sm:divide-x-2 divide-y-2 sm:divide-y-0 divide-jungle-700">
          {ANIMAL_ORDER.map(animal => {
            const preview = previewSkill(gameState, team, animal);
            const hasEffect = preview.myScoreDelta > 0 || preview.oppScoreDelta > 0 || preview.extraDraws > 0;
            const eligible = preview.level > 0;

            return (
              <button
                key={animal}
                onClick={() => eligible && onChoose(animal)}
                disabled={!eligible}
                className={`skill-choice-panel group relative flex flex-col items-stretch justify-end min-h-[360px] text-left ${
                  eligible ? '' : 'skill-choice-disabled cursor-not-allowed'
                }`}
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
                    {!hasEffect && !eligible && ''}
                  </p>
                  {!eligible && (
                    <p className="skill-outline-text text-lg font-black text-red-500">레벨이 부족합니다</p>
                  )}
                </div>
              </button>
            );
          })}

          <button
            onClick={onPass}
            className="skill-choice-panel group relative flex flex-col items-center justify-center min-h-[360px] bg-jungle-900"
          >
            <span className="text-5xl mb-3">🚫</span>
            <span className="skill-outline-text text-lg font-extrabold text-white">아무것도 하지 않음</span>
          </button>
        </div>
      </div>
    </div>
  );
}
