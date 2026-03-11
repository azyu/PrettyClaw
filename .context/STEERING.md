# PrettyClaw Steering

## Priority Order

1. **테스트 인프라** (T01~T03) — 안전망 먼저
2. **Store 리팩터링** (T04~T05) — 708 LOC → slice 분리
3. **Dead code 제거** (T09) — 정리
4. **문서/콘텐츠** (T12) — 콘텐츠
5. **CI/DX** (T10~T12) — 자동화
6. **나머지** — 우선순위순

## Phase Execution

| Phase | Tasks | 병렬 가능 | 선행 조건 |
|-------|-------|----------|----------|
| 1 — Foundation | T01, T02, T11 | T01+T11 병렬 | 없음 |
| 2 — Store | T03, T04, T05 | T04+T05 병렬 | T01 완료 |
| 3 — Cleanup | T08, T09, T10 | 전부 병렬 | 없음 |
| 4 — Content | T12 | 전부 병렬 | 없음 |
| 5 — Polish | T13~T17 | 부분 병렬 | T04 완료 |
| 6 — Enhancement | T18~T23 | 전부 병렬 | 코어 안정 |

## Constraints

- **strict TypeScript**: `noEmit` + strict mode, `any` 금지
- **400 LOC 제한**: 파일당 최대, 초과 시 분리 필수
- **Immutable patterns**: Zustand store에서 `new Map()`, spread 사용
- **lib/ 순수성**: `src/lib/` 파일은 store/React 의존 금지
- **Korean UI**: 사용자 대면 텍스트는 한국어
- **환경변수**: URL/토큰은 `NEXT_PUBLIC_*` 또는 서버 전용 env

## Definition of Done

태스크 완료 체크리스트:

- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 관련 테스트 작성 및 통과 (T01 이후)
- [ ] 400 LOC 제한 준수
- [ ] `console.log` 없음
- [ ] 하드코딩 값 없음
- [ ] TASKS.md 상태 업데이트

## Agent Assignment Strategy

- **파일 충돌 방지**: 동일 파일을 여러 에이전트가 동시 수정하지 않음
- **Store slice**: T04 완료 후 slice 파일별 에이전트 할당 가능
- **테스트 에이전트**: 구현 에이전트와 별도로 테스트 작성
- **완료 보고**: 각 에이전트는 TASKS.md 체크박스 업데이트
