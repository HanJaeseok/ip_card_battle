import type { Animal } from 'shared';

export const ANIMAL_INFO: Record<Animal, { name: string; emoji: string }> = {
  sheep:   { name: '실용신양', emoji: '🐑' },
  rabbit:  { name: '상표토끼', emoji: '🐰' },
  mermaid: { name: '디자인어', emoji: '🧜‍♀️' },
  tiger:   { name: '특허랑이', emoji: '🐯' },
};
