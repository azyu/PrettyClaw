# Sana Character Implementation Record

> Executed in this session. This document records the exact change set, verification steps, and observed results.

**Goal:** 기존 Sana 자산을 사용해 locale 템플릿과 bootstrap 프롬프트까지 포함한 전체 캐릭터를 추가한다.

**Architecture:** 런타임이 읽는 locale별 character template JSON에 Sana를 두 번째 항목으로 추가하고, `prettyclaw init`이 복사할 locale별 agent prompt template을 함께 만든다. 동작 검증은 repository config 파일을 직접 읽는 `node:test`로 수행한다.

**Tech Stack:** TypeScript, Next.js config JSON, Markdown prompt templates, `node:test`

**Status:** Completed in this session. 아래 체크리스트는 실제 수행 순서와 검증 결과를 기록한다.

---

## Chunk 1: Tests First

### Task 1: Character template regression test

**Files:**
- Modify: `src/lib/character-config.test.ts`
- Modify: `config/characters.en.template.json`
- Modify: `config/characters.ko.template.json`
- Modify: `config/characters.ja.template.json`
- Modify: `config/characters.template.json`

- [x] **Step 1: Confirm the failing test**

실제 failing test는 `src/lib/character-config.test.ts`의 `repository locale templates include Sana as the second default character`였다.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/character-config.test.ts`
Observed: FAIL because `config/characters.en.template.json`, `config/characters.ko.template.json`, and `config/characters.ja.template.json` had no second `sana` entry.

- [x] **Step 3: Write minimal implementation**

다음 파일에 Sana 항목을 정확히 추가한다.
- `config/characters.en.template.json`
- `config/characters.ko.template.json`
- `config/characters.ja.template.json`
- `config/characters.template.json`

- [x] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/character-config.test.ts`
Observed: PASS

### Task 2: Agent prompt template regression test

**Files:**
- Modify: `src/lib/agent-files.test.ts`
- Create: `config/agents/en/sana/IDENTITY.md`
- Create: `config/agents/en/sana/SOUL.md`
- Create: `config/agents/ko/sana/IDENTITY.md`
- Create: `config/agents/ko/sana/SOUL.md`
- Create: `config/agents/ja/sana/IDENTITY.md`
- Create: `config/agents/ja/sana/SOUL.md`

- [x] **Step 1: Confirm the failing test**

실제 failing test는 `src/lib/agent-files.test.ts`의 `repository includes Sana prompt templates for every locale`였다.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/agent-files.test.ts`
Observed: FAIL because the following files did not exist:
- `config/agents/en/sana/IDENTITY.md`
- `config/agents/en/sana/SOUL.md`
- `config/agents/ko/sana/IDENTITY.md`
- `config/agents/ko/sana/SOUL.md`
- `config/agents/ja/sana/IDENTITY.md`
- `config/agents/ja/sana/SOUL.md`

- [x] **Step 3: Write minimal implementation**

다음 파일을 생성하고 Sana 이름/페르소나가 들어간 최소 프롬프트를 작성한다.
- `config/agents/en/sana/IDENTITY.md`
- `config/agents/en/sana/SOUL.md`
- `config/agents/ko/sana/IDENTITY.md`
- `config/agents/ko/sana/SOUL.md`
- `config/agents/ja/sana/IDENTITY.md`
- `config/agents/ja/sana/SOUL.md`

- [x] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/agent-files.test.ts`
Observed: PASS

## Chunk 2: Init Seeding Verification

### Task 3: initPrettyClaw seeding regression test

**Files:**
- Modify: `src/lib/prettyclaw-cli.test.ts`
- Source: `config/characters.en.template.json`
- Source: `config/agents/en/yuki/IDENTITY.md`
- Source: `config/agents/en/yuki/SOUL.md`
- Source: `config/agents/en/sana/IDENTITY.md`
- Source: `config/agents/en/sana/SOUL.md`

- [x] **Step 1: Add the regression test**

`src/lib/prettyclaw-cli.test.ts`에서 `mkdtemp(join(tmpdir(), "prettyclaw-cli-init-seeding-"))`로 만든 임시 package root 아래, `initPrettyClaw`가 bootstrap 실패 전 단계에서 다음 상대 경로를 seed하는지 검증한다.
- `.config/prettyclaw/characters.en.json`
- `.config/prettyclaw/agents/yuki/en/IDENTITY.md`
- `.config/prettyclaw/agents/yuki/en/SOUL.md`
- `.config/prettyclaw/agents/sana/en/IDENTITY.md`
- `.config/prettyclaw/agents/sana/en/SOUL.md`

- [x] **Step 2: Run the test**

Run: `node --test src/lib/prettyclaw-cli.test.ts`
Observed: PASS via `initPrettyClaw seeds locale character config and Sana prompt files before bootstrap`

## Chunk 3: Verification

### Task 4: Full verification

**Files:**
- Verify only

- [x] **Step 1: Run targeted tests**

Run: `node --test src/lib/character-config.test.ts src/lib/agent-files.test.ts`
Observed: PASS

- [x] **Step 2: Run project verification**

Run:
- `npx tsc --noEmit`
- `node --test src/lib/*.test.ts`
- `npm run build`

Observed: PASS
