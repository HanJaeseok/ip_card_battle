# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**한국특허정보원 카드배틀** — 10×10 보드에서 4종 아기 동물 카드(실용신양·상표토끼·디자인어·특허랑이)를 팀 대전으로 짝 맞추는 실시간 멀티플레이 웹 게임. 상세 규칙·밸런스 수치·마일스톤은 `ROADMAP.md` 참조.

## 기술 스택

- **클라이언트**: Next.js 15 App Router + TypeScript + Tailwind CSS v4 + ShadcnUI (new-york 스타일)
- **서버**: Node.js + WebSocket (`ws` 라이브러리)
- **공유**: `/shared` 디렉토리에 상수·타입 정의

## 디렉토리 구조 (목표)

```
/client     Next.js 앱 (렌더링·UI·WebSocket 클라이언트)
/server     Node.js 게임 서버 (상태 관리·타이머·특수 효과)
/shared     상수·타입 (양쪽에서 import)
```

## 개발 명령어

```bash
# 클라이언트
npm run dev       # 개발 서버 (Next.js)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint

# 서버
node server/index.js   # 게임 서버 실행

# 테스트 (단위·시뮬레이션)
npm test               # 전체 테스트
npm test -- <파일명>   # 단일 파일 테스트
```

## 핵심 아키텍처 원칙

### 서버가 유일한 진실(Source of Truth)
- 게임 상태 전체는 서버에만 존재. 카드의 animal/num은 **미오픈 상태에서 절대 클라이언트로 전송하지 않음** (치팅 방지).
- 모든 랜덤(강제진행 카드 선택, 실용신양 추가 오픈, 보드 확장 배치)은 서버에서 생성.
- 30초 턴 타이머는 서버가 `turnDeadline` timestamp로 관리; 클라이언트 타이머는 표시 전용.

### 보드 좌표계
- `Map<"r,c", Card>` (음수 좌표 허용) — 20턴 확장 시 외곽 링만 추가하면 되므로 재배치 불필요.
- 초기: 0~9, 확장 후: 외곽 링 추가 (예: -2~11).

### lastLevel 방식 임계값 판정
```js
// 동물별 threshold가 다름에 주의
const THRESHOLDS = { sheep: 10, rabbit: 10, mermaid: 20, tiger: 20 };
// 매 턴 floor(score/threshold)를 lastLevel과 비교 → 새로 넘은 구간만 발동
```

### 내부 코드 키 매핑
```
sheep  = 실용신양 (실용신안)
rabbit = 상표토끼 (상표)
mermaid = 디자인어 (디자인)
tiger  = 특허랑이 (특허)
```

### 특수 효과 핵심 수치

| 동물 | threshold | 핵심 계수 |
|---|---|---|
| sheep | 10 | n장 추가 오픈, 연쇄 cap ~300~400 |
| rabbit | 10 | `n × 현재턴수`점, 턴 종료 훅 + lastLevel 갱신 후 재폭주 방지 |
| mermaid | 20 | 뒤처짐: 격차×0.5 흡수 / 앞섬: `round(n×턴×0.3)` 보너스 |
| tiger | 20 | 상대 sheep·rabbit 각 `round(n×턴×1.5)` 감소 (min 0) |

## 개발 우선순위 (마일스톤)

1. **M1** — Task 0+1: UI 없이 봇 대전 40턴 완주 + 단위 테스트 통과
2. **M2** — Task 2: 브라우저 2개로 1:1 실시간 대전 (임시 UI)
3. **M3** — Task 3: 확정 목업 UI (타이머 바, 글로우 펄스, 공격력 바)
4. **M4** — Task 4: 카드 플립·숫자별 리액션·실용신양 연쇄 흔들림 등 전 이벤트 연출
5. **M5** — Task 5+6: QA + 초대 링크 배포

> ⚠️ Task 1(게임 엔진)을 UI와 완전히 분리해 먼저 완성할 것. 규칙이 복잡(연쇄 오픈, lastLevel, 턴 종료 훅)하여 UI에 섞으면 디버깅이 매우 어려움.

## UI 확정 사항 (Task 3 참고)

- 정글 색 팔레트 (연두·녹색 바탕, 갈색 나뭇가지)
- 현재 차례 플레이어 닉네임 칩: 흰색 글로우 펄스 (`box-shadow` + `@keyframes`, `prefers-reduced-motion` 대응 필수)
- 특허랑이 아래 공격력 표시: `round((lastLevel+1) × 현재턴 × 1.5)` 실시간 계산
- 턴 바: 모래시계(⏳) 아이콘 + 30초 카운트다운 프로그레스바
- 카드판: 마우스 휠 확대/축소 + 드래그 패닝 (터치 포함)
- 카드 플립: CSS `rotateY` 3D (~250ms) 후 숫자별 리액션 트리거 (1=먼지, 2~3=윙크, 4~5=윙크+👍, 6=윙크+👍+금빛)
- 미확정 항목(디자인어 연출 등)은 별도 확정 전 구현 보류

## 에이전트 사용 가이드

| 상황 | 에이전트 |
|---|---|
| 구현 완료 후 코드 품질 검토 | `code-reviewer` |
| App Router 페이지·레이아웃·라우팅 설계 | `nextjs-app-developer` |
| 스타터킷 초기화·보일러플레이트 정리 | `starter-cleaner` |
| UI 컴포넌트 마크업·스타일링 (로직 제외) | `ui-markup-specialist` |
