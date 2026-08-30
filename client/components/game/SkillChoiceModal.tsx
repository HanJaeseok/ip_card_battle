'use client';

import type { Animal, ClientGameState, Team } from 'shared';
import { previewSkill } from '@/lib/skills';
import { SKILL_TITLE, SKILL_COLOR, describeSkill } from '@/lib/skillInfo';
import { TurnTimer } from './TurnTimer';

const ANIMAL_ORDER: Animal[] = ['sheep', 'rabbit', 'mermaid', 'tiger'];

// 서버는 이 팀에게 고를 수 있는 스킬이 하나도 없으면 애초에 pendingChoice를 세우지 않고
// 조용히 자동으로 턴을 넘긴다 — 그래서 이 모달은 항상 최소 하나 이상 고를 수 있는
// 스킬이 있을 때만 뜨고, "레벨 부족으로 자동 패스" 같은 화면은 따로 없다.
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
            className="skill-choice-panel group relative flex flex-col items-stretch justify-end min-h-[360px] text-left bg-jungle-900"
          >
            <div className="relative z-10 flex flex-col gap-2 p-4">
              <span className="text-4xl mb-1">🌱</span>
              <h3 className="skill-outline-text text-xl font-extrabold text-jungle-300">&lt;다음 기회를 노리기&gt;</h3>
              <p className="skill-outline-text text-sm text-white leading-relaxed">
                레벨을 높이고, 더 큰 효과로 한번에 몰아칩니다. 이번 턴에는 스킬을 사용하지 않습니다.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
