// 스킬 관련 표시용 상수·문구 — SkillChoiceModal과 ScorePanel(호버 툴팁)이 함께 사용한다.
import type { Animal } from 'shared';

export const SKILL_TITLE: Record<Animal, string> = {
  sheep: '실용신양',
  rabbit: '상표토끼',
  mermaid: '디자인어',
  tiger: '특허랑이',
};

export const SKILL_COLOR: Record<Animal, string> = {
  sheep: '#84cc16',
  rabbit: '#ec4899',
  mermaid: '#3b82f6',
  tiger: '#f97316',
};

export function describeSkill(animal: Animal, level: number): string {
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
