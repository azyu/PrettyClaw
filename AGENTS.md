# AGENTS.md — PrettyClaw

> `CLAUDE.md` is a symlink to `AGENTS.md`.

## Read First

- `docs/references.md` — project concept, tech stack, ADRs, file map
- `docs/openclaw-persona-research.md` — OpenClaw multi-agent architecture analysis
- `docs/persona-override-guide.md` — persona override notes
- `.context/TASKS.md` — task list and priorities
- `.context/STEERING.md` — agent coordination rules

## Project Structure

```text
PrettyClaw/
├── config/
│   └── characters.template.json  # seed template for character config
├── src/
│   ├── app/
│   │   ├── page.tsx                  # initial load → bootstrap → auto-connect
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── characters/route.ts
│   │       ├── bootstrap-agents/route.ts
│   │       └── push-persona/route.ts # deprecated
│   ├── components/                   # 10 VN UI components
│   ├── stores/useAppStore.ts         # single Zustand store (763 LOC) ⚠️
│   ├── lib/
│   │   ├── character-config.ts       # loads/seeds ~/.config/prettyclaw/characters.json
│   │   ├── agent-bootstrap.ts        # syncs agent workspace prompt files
│   │   ├── gateway-client.ts
│   │   ├── gateway-device-auth.ts
│   │   ├── gateway-connection.ts
│   │   └── *.test.ts                 # node:test unit tests
│   └── types/index.ts
├── public/
│   ├── backgrounds/
│   └── characters/
├── docs/
├── .context/
├── AGENTS.md
├── CLAUDE.md
├── package.json
└── tsconfig.json
```

## Build & Development

```bash
npm run dev
npx tsc --noEmit
node --test src/lib/*.test.ts
npm run build
```

`npm run lint` currently points to `next lint`, but in this Next 16 setup it does not run correctly. Do not treat it as a required verification command until the script is fixed.

## Code Standards

### Do

- Use selector subscriptions only: `useAppStore((s) => s.field)`
- Keep Zustand updates immutable with `new Map()`, `new Set()`, spreads, etc.
- Keep user-facing UI text in Korean
- Keep `src/lib/` free of React and store dependencies
- Treat `~/.config/prettyclaw/characters.json` as the source of truth for characters
- Add new default characters to `config/characters.template.json`
- For bug fixes, add a `node:test` reproduction test when practical

### Don't

- Do not mutate Zustand state directly
- Do not move character definitions back into a hard-coded source file
- Do not import `useAppStore` from `lib`
- Do not subscribe with `useAppStore()` without a selector
- Do not use `any`
- Do not hard-code URLs or tokens

## Known Gotchas

- `/api/bootstrap-agents` does more than create missing agents. It also rewrites `IDENTITY.md`, `SOUL.md`, and `USER.md` for existing agent workspaces.
- `loadCharacterConfig()` seeds `~/.config/prettyclaw/characters.json` from the template when the file does not exist.
- `characters.json` is merged with the template by `id`. Partial overrides are fine, but changing `id` breaks fallback behavior.
- `push-persona/route.ts` is deprecated. Bootstrap sync is the current persona update path.
- `useAppStore.ts` is currently 763 LOC. Consider slice extraction before making it larger.
- `gateway-client.ts` and `CharacterSprite.tsx` are also growing hotspots.

## After Code Changes

Default verification order:

```bash
npx tsc --noEmit
node --test src/lib/*.test.ts
npm run build
```

Add these checks when relevant:

- UI changes: run `npm run dev` and do a manual smoke test
- Gateway/session changes: verify actual `agent:<agentId>:<sessionKey>` routing
- Character config changes: verify both `~/.config/prettyclaw/characters.json` and `~/.openclaw/workspace-<agentId>/SOUL.md`

## Environment

```bash
# .env.local (do not commit)
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:18789
NEXT_PUBLIC_GATEWAY_TOKEN=your-token-here
```

Additional local files:

- `~/.config/prettyclaw/characters.json` — character source of truth
- `~/.openclaw/workspace-<agentId>/` — per-agent workspace written by bootstrap

## Testing

The current test stack is lightweight `node:test`.

```bash
node --test src/lib/*.test.ts
```

- Current test files: `src/lib/agent-bootstrap.test.ts`, `src/lib/character-config.test.ts`
- UI/E2E test frameworks are not installed yet

## Commit Conventions

```text
<type>: <description>

feat:     new feature
fix:      bug fix
refactor: refactor
test:     add/update tests
chore:    build, config, docs
perf:     performance improvement
```

## Multi-Agent Coordination

- Tasks: `.context/TASKS.md`
- Coordination rules: `.context/STEERING.md`
- Assign work by TASKS priority and phase
- Avoid concurrent edits to the same file
- Each agent should verify with `tsc + node:test + build`
