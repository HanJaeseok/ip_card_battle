'use client';

import type { Animal, ClientGameState, Team } from 'shared';
import { previewSkill } from '@/lib/skills';
import { SKILL_TITLE, SKILL_COLOR, describeSkill } from '@/lib/skillInfo';

const ANIMAL_ORDER: Animal[] = ['sheep', 'rabbit', 'mermaid', 'tiger'];

// 턴을 마친 뒤 행동을 고르는 영역 — 화면을 덮는 모달이 아니라 항상 보드 아래
// (양 팀 합계 사이)에 자리한다. 로직은 기존과 동일하게 "내 팀의 행동 선택
// 차례"일 때만 클릭이 가능하고, 그 외에는 마우스를 올려 설명만 미리 볼 수 있다.
// 지금 누를 수 있는 패널(레벨이 있어 고를 수 있는 행동, 그리고 항상 고를 수
// 있는 "아무것도 하지 않음")은 은은하게 빛나 무엇을 눌러야 할지 강조해준다.
export function SkillChoiceBar({
  gameState,
  team,
  interactive,
  onChoose,
  onPass,
}: {
  gameState: ClientGameState;
  team: Team;
  interactive: boolean; // 지금이 실제로 이 팀(=나)이 행동을 고를 차례인지
  onChoose: (animal: Animal) => void;
  onPass: () => void;
}) {
  const previews = ANIMAL_ORDER.map(animal => previewSkill(gameState, team, animal));
  const multiplier = gameState.teams[team].pendingMultiplier;

  return (
    <div className="h-full min-h-0 bg-jungle-950 rounded-2xl overflow-hidden grid grid-cols-5 divide-x-2 divide-jungle-700">
      {ANIMAL_ORDER.map((animal, i) => {
        const preview = previews[i];
        const hasEffect = preview.myHpDelta > 0 || preview.oppHpDelta < 0 || preview.extraDraws > 0;
        const eligible = preview.level > 0;
        const clickable = interactive && eligible;

        return (
          <button
            key={animal}
            onClick={() => clickable && onChoose(animal)}
            disabled={!clickable}
            className={`skill-choice-panel group relative flex flex-col items-stretch justify-end text-left ${
              eligible ? '' : 'skill-choice-disabled'
            } ${clickable ? 'skill-choice-glow' : ''}`}
            style={{ backgroundImage: `url(/skills/${animal}_skill.png)` }}
          >
            <div className="skill-choice-dim absolute inset-0" />
            {(hasEffect || (animal === 'mermaid' && eligible)) && (
              <span className="skill-outline-text absolute top-2 left-3 z-10 text-lg font-bold text-amber-300">
                {preview.extraDraws > 0 && `다음 턴 카드 +${preview.extraDraws}회`}
                {preview.myHpDelta > 0 && `체력 +${preview.myHpDelta}`}
                {preview.oppHpDelta < 0 && `상대 체력 ${preview.oppHpDelta}`}
                {animal === 'mermaid' && `다음 행동 ×${preview.multiplierAfter}`}
              </span>
            )}
            <span className="skill-outline-text absolute top-2 right-3 z-10 text-lg font-bold text-white">
              {eligible ? `레벨 ${preview.level} 소모` : '레벨 부족'}
            </span>
            <div className="relative z-10 flex flex-col gap-1.5 p-3 min-h-[9rem]">
              <h3
                className="skill-outline-text text-xl font-extrabold"
                style={{ color: SKILL_COLOR[animal] }}
              >
                &lt;{SKILL_TITLE[animal]}&gt;
              </h3>
              <p className="skill-outline-text text-base text-white leading-snug line-clamp-5">
                {describeSkill(animal, preview.level, multiplier)}
              </p>
            </div>
          </button>
        );
      })}

      <button
        onClick={() => interactive && onPass()}
        disabled={!interactive}
        className={`skill-choice-panel skill-choice-pass pass-panel-bg group relative flex flex-col items-stretch justify-end text-left ${
          interactive ? 'skill-choice-glow' : ''
        }`}
      >
        <div className="skill-choice-dim absolute inset-0" />
        <div className="relative z-10 flex flex-col gap-1.5 p-3 min-h-[9rem]">
          <h3 className="skill-outline-text text-xl font-extrabold text-jungle-200">&lt;다음을 노리기&gt;</h3>
          <p className="skill-outline-text text-base text-white leading-snug">
            레벨을 높이고, 더 큰 효과로 한번에 몰아칩니다. 이번 턴에는 행동을 사용하지 않습니다.
          </p>
        </div>
      </button>
    </div>
  );
}
