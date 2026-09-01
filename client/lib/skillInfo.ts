// 행동 관련 표시용 상수·문구 — SkillChoiceBar와 ScorePanel(호버 툴팁)이 함께 사용한다.
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

export function describeSkill(animal: Animal, level: number, multiplier: number): string {
  switch (animal) {
    case 'sheep':
      return `실용신안은 빠르게 등록해 실리를 챙기는 권리! 다음 턴에 카드를 (레벨×배율)회 더 뽑아 기회를 선점합니다. 지금 고르면 ${level}×${multiplier}회.`;
    case 'rabbit':
      return `상표는 쓸수록 브랜드 가치가 쌓이는 권리! 내 체력이 (레벨×배율)만큼 오릅니다. 지금 고르면 ${level}×${multiplier}.`;
    case 'mermaid':
      return `디자인은 다음 행동을 몇 배로 키워주는 권리! 대기 배율에 2^레벨을 곱합니다(스스로는 소모되지 않고 계속 쌓입니다). 지금 고르면 배율이 ${multiplier}가 됩니다.`;
    case 'tiger':
      return `특허는 독점적 실시를 막는 강력한 권리! 상대 체력을 (레벨×배율)만큼 강탈합니다(상대가 가진 만큼만). 지금 고르면 ${level}×${multiplier}.`;
  }
}
