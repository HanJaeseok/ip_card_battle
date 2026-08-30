// 스킬 관련 표시용 상수·문구 — SkillChoiceModal과 ScorePanel(호버 툴팁)이 함께 사용한다.
import type { Animal } from 'shared';
import { SKILL_COEFFICIENTS } from 'shared';

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
  const pct = SKILL_COEFFICIENTS[animal] * 100;
  switch (animal) {
    case 'sheep':
      return `실용신안은 빠르게 등록해 실리를 챙기는 권리! 다음 턴에 카드를 ${level}회 더 뽑아 기회를 선점합니다.`;
    case 'rabbit':
      return `상표는 쓸수록 브랜드 가치가 쌓이는 권리! 내가 잘 나갈수록 강해져, 내 총점의 ${pct}×${level}%만큼 획득합니다.`;
    case 'mermaid':
      return `디자인은 경쟁사와의 차별화가 핵심인 권리! 상대와 벌어진 점수 차의 ${pct}×${level}%만큼 차별화 가치로 획득합니다.`;
    case 'tiger':
      return `특허는 독점적 실시를 막는 강력한 권리! 상대가 앞서갈수록 강해져, 상대 점수를 ${pct}×${level}%만큼 깎습니다.`;
  }
}
