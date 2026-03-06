# Plugin Architecture PRD (Calendar / Kanban / Kanban-list / Timeline)

## 1. Goal

이 문서는 다음 4개 원칙 기준으로 현재 구조를 평가하고, 개선이 필요한 항목을 구현/백로그 단위로 정리한다.

1. 공통 코드/로직 최소화 및 재사용
2. 모듈화 코드 작성
3. 적절한 추상화 레이어
4. 과분리 코드 재통합

대상 경로:

- `src/calendar`
- `src/kanban`
- `src/kanban-list`
- `src/timeline`

## 2. Current Assessment Summary

### 2.1 Domain Score (5점 만점)

- `calendar`: 3.8 / 5
- `kanban`: 3.3 / 5
- `kanban-list`: 4.0 / 5
- `timeline`: 3.9 / 5

### 2.2 핵심 진단

- 강점:
  - calendar가 모달/상호작용 팩토리를 제공하고 timeline이 이를 재사용하는 패턴은 일관적이다.
  - 테스트 커버리지가 높고(`npm test` 통과), 서비스/유틸 레이어 분리가 전반적으로 명확하다.
- 약점:
  - 대형 파일에 책임이 과도하게 집중되어 있다(`EventFormModal`, `KanbanView`, `calendar interaction-service`).
  - 일부 공통 관심사(색상 정규화, vault refresh debounce)가 도메인별로 중복되어 있었다.
  - list view와 day/week/month의 interaction 조합 경로가 달라 일관성이 낮았다.
  - timeline과 calendar의 단일 컬럼 timed-grid 계산 로직에 중복이 있었다.

## 3. Implemented In This Cycle

아래 항목은 이번 사이클에서 실제 코드 반영 완료됨.

### 3.1 공통 코드 재사용 강화

- `src/shared/color/normalize-hex-color.ts` 추가
  - `normalizeHexColor` 공통화
  - `kanban`, `kanban-list`가 `calendar/utils/month-calendar-utils`를 직접 참조하던 의존 제거
- `src/shared/vault/register-vault-refresh.ts` 추가
  - vault 이벤트 등록/해제 로직 공통화
  - `calendar/services/vault-refresh-service.ts`
  - `kanban-list/services/refresh-service.ts`
  - 위 2개 서비스는 predicate만 주입하는 thin wrapper로 정리
- `src/shared/hooks/use-debounced-reload.ts` 추가
  - reload timer 보일러플레이트 공통화
  - 적용:
    - `src/calendar/view.tsx`
    - `src/timeline/view.tsx`
    - `src/kanban-list/hooks/use-kanban-list-data.ts`

### 3.2 모듈화/추상화 일관성 개선

- `src/calendar/view/list-calendar.tsx`
  - 기존 개별 modal/save/delete 핸들러 조합 제거
  - `useCalendarInteractionHandlers`로 통일
  - list/day/week/month interaction 진입점 패턴 일관화

### 3.3 과분리 재통합

- `src/timeline/hooks/use-timeline-modals.ts` 삭제
  - passthrough wrapper 제거
  - `use-timeline-interaction-handlers.ts`에서 `useCalendarModals` 직접 사용

### 3.4 중복 로직 통합 (timed-grid)

- `src/calendar/utils/single-column-time-grid.ts` 추가
  - 단일 컬럼 overlay 상태 계산
  - timed event 렌더 모델 계산 공통화
- 적용:
  - `src/calendar/_components/day-week/DayTimeGrid.tsx`
  - `src/timeline/_components/TimelineTimeGrid.tsx`

## 4. Improvement Backlog Status

### P0 (완료)

1. `EventFormModal` 분해 완료
   - 반영 파일:
     - `src/calendar/_components/modal/EventFormModal.tsx`
     - `src/calendar/_components/modal/EventFormContainer.tsx`
     - `src/calendar/_components/modal/EventFormView.tsx`
     - `src/calendar/_components/modal/use-event-form-draft.ts`
     - `src/calendar/_components/modal/event-form-color.ts`
     - `src/calendar/_components/modal/event-form-types.ts`
2. `calendar/services/interaction-service.ts` 책임 분리 완료
   - `src/calendar/services/interaction/*`로 drag/resize/selection/pointer/grid/derivers 분해
   - `src/calendar/services/interaction-service.ts`는 facade 재수출로 유지
3. `kanban/view.tsx` 대형 클래스 책임 축소 완료
   - board mutation/settings/color, card actions, cross-board move를 서비스로 위임
   - persistence를 `src/kanban/services/view-persistence-service.ts`로 분리
   - View 클래스는 lifecycle + render orchestration 중심으로 축소

### P1 (완료)

1. frontmatter 파싱 공통화 완료
   - `src/shared/frontmatter/markdown-frontmatter.ts` 추가
   - `src/shared/frontmatter/kanban-frontmatter.ts` 추가
   - `kanban/services/color-service.ts`, `kanban-list/services/model-service.ts`, `kanban-list/utils/frontmatter.ts`가 shared parser/상수 사용
2. calendar/timeline 공통 timed-grid base component 도입 완료
   - `src/shared/time-grid/SingleColumnTimedGridBase.tsx` 추가
   - `src/shared/time-grid/TimeGridRangeOverlay.tsx` 추가
   - `src/shared/time-grid/SingleColumnDayCell.tsx` 추가
   - `DayTimeGrid.tsx`, `TimelineTimeGrid.tsx`를 base 위임 구조로 치환
3. import 경계 규칙 추가 완료
   - `eslint.config.mjs`에 `import/no-restricted-paths` zone 규칙 추가
   - `kanban`/`kanban-list` 도메인의 타 도메인 직접 import 차단
   - `timeline`의 `calendar/_components` 직접 import 차단

### P2 (장기)

1. shared domain contracts 정리
   - event/timed placement 등 범용 타입을 shared contract로 분리 검토
2. 대형 view 파일 라인 가드
   - 파일 라인 수 초과 시 분해 권고를 lint/custom script로 자동화

## 5. Acceptance Criteria

다음 조건을 만족하면 구조 개선 목표를 달성한 것으로 본다.

1. 공통 관심사(색상 정규화, vault refresh, debounce reload)의 도메인 중복 구현이 없다.
2. list/day/week/month interaction 처리 경로가 동일한 handler layer를 사용한다.
3. timeline 과분리 wrapper가 제거되어 추상화 단계가 과도하지 않다.
4. timed-grid 단일 컬럼 계산 로직 중복이 공통 유틸로 통합된다.
5. `npm run lint`, `npm test`, `npm run build`가 모두 성공한다.

## 6. Verification Snapshot

검증 일시: 2026-03-03

- `npm run lint`: pass
- `npm test`: pass
- `npm run build`: pass

## 7. Risk & Notes

- P0/P1 작업은 완료되었고, 현재 검증은 통과했지만 UI 상호작용 회귀 여부는 실제 Obsidian 수동 확인이 최종 안전장치다.
- `KanbanView` 분해 시 Obsidian `TextFileView` lifecycle 동작 보존이 최우선이다.
- calendar/timeline 공통화는 UI/스타일 차이(특히 timeline) 유지가 핵심이며, 계산 로직과 표현 로직을 구분해서 진행해야 한다.
