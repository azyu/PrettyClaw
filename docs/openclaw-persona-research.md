# OpenClaw Persona/Identity Override Research

Research date: 2026-03-10
Purpose: Determine how PrettyClaw can run multiple character personas on a single OpenClaw Gateway.

## Executive Summary

OpenClaw **does** support fully isolated multi-agent workspaces with independent personas. The system works by:

1. Each agent gets its own **workspace directory** containing SOUL.md, IDENTITY.md, AGENTS.md, USER.md, etc.
2. These workspace files are **injected into the system prompt** as "Project Context" on every LLM turn.
3. The agent's workspace is resolved via `resolveAgentWorkspaceDir()` based on the `agents.list[].workspace` config entry.
4. Session keys encode the agent ID (e.g., `agent:prettyclaw-yuki:main`), which routes to the correct workspace.

**The persona override DOES work** -- but only when sessions are correctly routed to the agent. The issue we encountered was likely that sessions were hitting the **default/main agent** workspace instead of the prettyclaw-yuki agent workspace.

---

## How the System Prompt is Built (Source Code Analysis)

### Key Source Files

- `src/agents/system-prompt.ts` -- `buildAgentSystemPrompt()` constructs the full system prompt
- `src/agents/workspace.ts` -- `loadWorkspaceBootstrapFiles()` loads SOUL.md, IDENTITY.md, etc.
- `src/agents/bootstrap-files.ts` -- `resolveBootstrapContextForRun()` orchestrates loading
- `src/agents/agent-scope.ts` -- `resolveAgentWorkspaceDir()` maps agentId to workspace path
- `src/agents/identity-file.ts` -- Parses IDENTITY.md fields (name, emoji, avatar, etc.)
- `src/gateway/server-methods/agents.ts` -- `agents.files.set` RPC handler
- `src/gateway/assistant-identity.ts` -- Resolves display identity for UI

### System Prompt Structure

The system prompt is built by `buildAgentSystemPrompt()` and includes, in order:

```
You are a personal assistant running inside OpenClaw.

## Tooling
[tool list + descriptions]

## Safety
[guardrails]

## Workspace
Your working directory is: <workspaceDir>

## Workspace Files (injected)
These user-editable files are loaded by OpenClaw and included below in Project Context.

# Project Context
The following project context files have been loaded:
If SOUL.md is present, embody its persona and tone. [...]

## IDENTITY.md
[content]

## SOUL.md
[content]

## USER.md
[content]

## AGENTS.md
[content]
```

**Critical finding:** The system prompt explicitly says:
> "If SOUL.md is present, embody its persona and tone. Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it."

This means SOUL.md IS the primary persona mechanism. It gets injected into every LLM call.

### Bootstrap File Loading

From `workspace.ts`, the bootstrap files loaded per session are:

| File | Purpose | Loaded for subagents? |
|------|---------|----------------------|
| AGENTS.md | Operating instructions | Yes |
| SOUL.md | Persona, tone, boundaries | Yes |
| TOOLS.md | Tool guidance | Yes |
| IDENTITY.md | Name, emoji, avatar | Yes |
| USER.md | User preferences | Yes |
| HEARTBEAT.md | Heartbeat checklist | No |
| BOOTSTRAP.md | First-run ritual | No |
| MEMORY.md | Long-term memory | No |

### Workspace Resolution Chain

```typescript
// From agent-scope.ts
export function resolveAgentWorkspaceDir(cfg: OpenClawConfig, agentId: string) {
  const configured = resolveAgentConfig(cfg, id)?.workspace?.trim();
  if (configured) {
    return resolveUserPath(configured);  // <-- Uses agents.list[].workspace
  }
  // Default agent falls back to ~/.openclaw/workspace
  if (id === defaultAgentId) {
    return resolveDefaultAgentWorkspaceDir(process.env);
  }
  // Non-default agents without explicit workspace get:
  // ~/.openclaw/workspace-<agentId>
  return path.join(stateDir, `workspace-${id}`);
}
```

---

## What `agents.files.set` Actually Does

From `src/gateway/server-methods/agents.ts`:

```typescript
"agents.files.set": async ({ params, respond }) => {
  // 1. Validates the file name is in the allowed set
  // 2. Resolves the agent's workspace directory
  // 3. Writes the file content to workspaceDir/name
  // 4. Returns success with file metadata
}
```

**Allowed file names:** AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md, HEARTBEAT.md, BOOTSTRAP.md, MEMORY.md, memory.md

**The API does work correctly.** It writes to the agent's resolved workspace directory. However:

- It does NOT trigger a restart or reload
- Bootstrap files are **cached per session** via `bootstrap-cache.ts`
- Changes only take effect on **new sessions** or after the cache expires
- The cache key includes the workspace directory AND session key

### Why Changes May Not Appear Immediately

The bootstrap cache (`src/agents/bootstrap-cache.ts`) caches loaded workspace files per session key. If you modify files via `agents.files.set` during an active session, the **existing session** may continue using cached versions until:

1. A new session is created
2. The cache expires
3. The gateway restarts

**Recommendation:** After modifying workspace files, create a new session (or use `sessions.reset` on the existing one).

---

## Multi-Agent Architecture Deep Dive

### How Sessions Route to Agents

Session keys encode the agent ID:
```
agent:<agentId>:<scope>
```

Examples:
- `agent:main:main` -- default agent's main session
- `agent:prettyclaw-yuki:main` -- prettyclaw-yuki agent's main session
- `agent:prettyclaw-yuki:direct:user123` -- a direct chat session

When `chat.send` is called with a `sessionKey`, OpenClaw:
1. Parses the agent ID from the session key
2. Resolves the workspace directory for that agent
3. Loads bootstrap files from that workspace
4. Builds the system prompt with those files as Project Context
5. Runs the LLM with that system prompt

### Agent Configuration (from actual config)

```json5
{
  agents: {
    list: [
      {
        id: "prettyclaw-yuki",
        workspace: "/Users/azyu/.openclaw/workspace/agents/prettyclaw-yuki",
        // Optional: model, identity, sandbox, tools, etc.
      }
    ]
  }
}
```

### What Each Agent Workspace Needs

For a character persona, you need at minimum:

| File | Required? | Purpose |
|------|-----------|---------|
| SOUL.md | **Yes** | Primary persona definition. The system prompt says "embody its persona and tone." |
| IDENTITY.md | **Yes** | Name, emoji, avatar. Parsed as structured fields. |
| USER.md | Recommended | Who the user is, how to address them |
| AGENTS.md | Recommended | Operating instructions, behavior rules |

**IDENTITY.md format** (parsed by `identity-file.ts`):

```markdown
- Name: 유키
- Emoji: snowflake or similar
- Creature: high school girl
- Vibe: warm, curious, slightly shy
- Avatar: path/to/avatar.png
```

**SOUL.md** is free-form markdown. The system prompt instructs the LLM to embody whatever persona is described here.

---

## How Clawpal and openclaw-agents Handle Persona

### Clawpal (smartchainark/clawpal)

Clawpal takes the **overwrite-main-workspace** approach:

1. Directly writes to `~/.openclaw/workspace/SOUL.md` and `IDENTITY.md`
2. Does NOT create separate agents
3. Modifies the global/main agent's personality
4. Supports custom workspaces via `--workspace` flag

Key code from `bin/cli.js`:
```javascript
const SOUL_MD = path.join(OPENCLAW_WORKSPACE, "SOUL.md");
const IDENTITY_MD = path.join(OPENCLAW_WORKSPACE, "IDENTITY.md");
// ... later:
fs.writeFileSync(soulMd, currentSoul.trimEnd() + "\n\n" + personaText.trim() + "\n");
```

**Limitation:** Only one character at a time on the main agent.

### openclaw-agents (will-assistant/openclaw-agents)

Also uses the **overwrite-main-workspace** approach:

```bash
for file in SOUL.md IDENTITY.md AGENTS.md; do
    cp "$agent_dir/$file" "$target/$file"
done
```

Where `$target` defaults to `~/.openclaw/workspace`.

**Neither project supports multiple simultaneous personas.** They both overwrite the single workspace.

---

## Answers to Key Questions

### 1. Does `agents.files.set` actually modify the system prompt for new sessions?

**Yes**, but with caveats:
- It writes to the correct workspace directory
- New sessions will pick up the changes
- Existing sessions use cached bootstrap files
- You must use the correct agent ID so it writes to the right workspace

### 2. Is there a way to inject a system prompt per-session (not per-agent)?

**Partially.** The `sessions.patch` method supports:
- `model` -- override the model per session
- `thinkLevel` -- thinking level override
- `label` -- session label

But there is **no `systemPrompt` or `extraSystemPrompt` field** in `sessions.patch`. The system prompt is always built from workspace files.

However, `chat.send` params flow through to `RunEmbeddedPiAgentParams` which has an `extraSystemPrompt` field. This is used internally for group chat context but is **not exposed via the WS RPC protocol** to external clients.

**Workaround for per-session persona:** Use a different agent ID per character. Each agent has its own workspace with its own SOUL.md.

### 3. Can you have multiple agents with truly isolated workspaces?

**Yes, this is a first-class feature.** From the multi-agent docs:

> "With multiple agents, each agentId becomes a fully isolated persona: Different phone numbers/accounts, Different personalities (per-agent workspace files like AGENTS.md and SOUL.md), Separate auth + sessions."

Each agent gets:
- Its own workspace directory
- Its own `agentDir` (auth profiles, model registry)
- Its own session store under `~/.openclaw/agents/<agentId>/sessions`

### 4. What is the recommended way to have multiple personas on one Gateway?

**Use `agents.list` in the config.** This is the official multi-agent feature.

```json5
{
  agents: {
    list: [
      {
        id: "yuki",
        workspace: "~/.openclaw/workspace-yuki",
        identity: { name: "유키", emoji: "snowflake" }
      },
      {
        id: "sakura",
        workspace: "~/.openclaw/workspace-sakura",
        identity: { name: "사쿠라", emoji: "cherry_blossom" }
      },
      {
        id: "rin",
        workspace: "~/.openclaw/workspace-rin",
        identity: { name: "린", emoji: "fire" }
      }
    ]
  }
}
```

### 5. Does the `config.patch` method support system prompt override?

**No.** `config.patch` modifies the global `openclaw.json` config and optionally triggers a restart. It does not support per-session or per-request system prompt injection.

### 6. Does the bootstrap hook mechanism support dynamic persona switching?

**Yes, theoretically.** There is an `agent:bootstrap` internal hook (via `bootstrap-hooks.ts`) that allows plugins to intercept and modify bootstrap files before injection. A plugin could swap SOUL.md content per-session. However, this requires writing an OpenClaw plugin and is not available via the WS RPC protocol.

---

## Root Cause: Why prettyclaw-yuki Responses Use Claw's Persona

Based on the analysis, the likely cause is one of:

### Scenario A: Session key doesn't encode the agent ID

If PrettyClaw sends `chat.send` with `sessionKey: "main"` instead of `sessionKey: "agent:prettyclaw-yuki:main"`, the message will be routed to the **default agent** (main), which uses `~/.openclaw/workspace` -- the global workspace that has Claw's persona.

**Fix:** Always use session keys that include the agent ID prefix.

### Scenario B: Workspace is a subdirectory of the main workspace

The prettyclaw-yuki workspace is at `/Users/azyu/.openclaw/workspace/agents/prettyclaw-yuki`. This is **inside** the main workspace (`/Users/azyu/.openclaw/workspace`). While `resolveAgentWorkspaceDir` should still return the correct path, there could be path resolution edge cases.

**Fix:** Use a top-level workspace directory like `~/.openclaw/workspace-prettyclaw-yuki`.

### Scenario C: The main workspace was already overwritten

Looking at the actual files:
- `~/.openclaw/workspace/IDENTITY.md` -- contains 유키's persona
- `~/.openclaw/workspace/SOUL.md` -- contains 유키's persona

The main workspace was already modified to have 유키's persona. If sessions are hitting the main workspace, they'd get 유키 (not Claw). But if sessions were reset before the workspace was modified, the old cached persona might persist.

### Scenario D: Bootstrap cache serving stale data

The bootstrap cache may be serving files from before the workspace was updated. A gateway restart or session reset would clear this.

---

## Recommended Architecture for PrettyClaw

### Option 1: Separate Agents per Character (RECOMMENDED)

Create one OpenClaw agent per character, each with its own workspace:

```json5
// In ~/.openclaw/openclaw.json
{
  agents: {
    list: [
      {
        id: "prettyclaw-yuki",
        workspace: "~/.openclaw/workspace-prettyclaw-yuki",
        identity: { name: "유키", emoji: "snowflake" },
        model: "anthropic/claude-sonnet-4-5"  // or whatever
      },
      {
        id: "prettyclaw-sakura",
        workspace: "~/.openclaw/workspace-prettyclaw-sakura",
        identity: { name: "사쿠라", emoji: "cherry_blossom" },
        model: "anthropic/claude-sonnet-4-5"
      },
      {
        id: "prettyclaw-rin",
        workspace: "~/.openclaw/workspace-prettyclaw-rin",
        identity: { name: "린", emoji: "fire" },
        model: "anthropic/claude-sonnet-4-5"
      }
    ]
  }
}
```

**PrettyClaw setup flow:**

```typescript
// 1. Create agents via API (one-time setup)
await gateway.call("agents.create", {
  name: "prettyclaw-yuki",
  workspace: "~/.openclaw/workspace-prettyclaw-yuki",
  emoji: "snowflake"
});

// 2. Write persona files
await gateway.call("agents.files.set", {
  agentId: "prettyclaw-yuki",
  name: "SOUL.md",
  content: yukiSoulMd
});

await gateway.call("agents.files.set", {
  agentId: "prettyclaw-yuki",
  name: "IDENTITY.md",
  content: yukiIdentityMd
});

// 3. Send messages using agent-scoped session keys
await gateway.call("chat.send", {
  sessionKey: "agent:prettyclaw-yuki:main",
  message: "Hello!",
  deliver: false,
  idempotencyKey: uuid()
});
```

**Session key format for multi-agent:**
```
agent:<agentId>:<sessionScope>
```

For PrettyClaw, use:
```
agent:prettyclaw-yuki:main       // yuki's main session
agent:prettyclaw-sakura:main     // sakura's main session
agent:prettyclaw-rin:main        // rin's main session
```

**Pros:**
- Full workspace isolation
- Each character has independent SOUL.md, IDENTITY.md, AGENTS.md
- Session history is separate per character
- Can use different models per character
- Clean separation of concerns

**Cons:**
- Requires agent creation (one-time, can be done via API)
- More disk space (separate workspace per character)
- Gateway restart may be needed after adding agents to config

### Option 2: Single Agent + Dynamic Workspace Files (NOT RECOMMENDED)

Overwrite SOUL.md/IDENTITY.md via `agents.files.set` before each session. This is what Clawpal does.

**Why not recommended for PrettyClaw:**
- Race condition: switching files while another character session is active
- No true isolation
- Chat history mixes characters
- Complex state management

### Option 3: Custom Plugin for Dynamic Persona (ADVANCED)

Write an OpenClaw plugin that hooks into `agent:bootstrap` and dynamically swaps SOUL.md content based on session metadata.

**Why not recommended for now:**
- Requires OpenClaw plugin development
- Plugin API is not well documented for external developers
- More complexity than needed when Option 1 works

---

## Implementation Checklist for PrettyClaw

### Phase 1: Agent Setup

1. [ ] Move workspace directories to top-level (not nested in main workspace):
   - `~/.openclaw/workspace-prettyclaw-yuki`
   - `~/.openclaw/workspace-prettyclaw-sakura`
   - `~/.openclaw/workspace-prettyclaw-rin`

2. [ ] Create SOUL.md for each character with full persona instructions
3. [ ] Create IDENTITY.md with structured fields (Name, Emoji, Avatar)
4. [ ] Create AGENTS.md with operating instructions per character
5. [ ] Create USER.md describing the user's relationship to the character

### Phase 2: Gateway Config

6. [ ] Add agents to `~/.openclaw/openclaw.json` under `agents.list`
7. [ ] Restart gateway: `openclaw gateway restart`
8. [ ] Verify: `openclaw agents list`

### Phase 3: PrettyClaw Client

9. [ ] Use `agents.list` API to discover available agents (already done)
10. [ ] Map character IDs to agent IDs
11. [ ] Use agent-scoped session keys: `agent:<agentId>:main`
12. [ ] On character switch in UI, switch the session key
13. [ ] Use `sessions.reset` when starting a fresh conversation

### Phase 4: Dynamic Setup (Optional)

14. [ ] On first launch, check if agents exist via `agents.list`
15. [ ] If missing, create via `agents.create` + `agents.files.set`
16. [ ] Store character persona templates in PrettyClaw's source code

---

## Example Workspace Files

### SOUL.md for 유키

```markdown
# SOUL.md

_You are not a chatbot. You are 유키(ユキ)._

당신은 유키입니다. AI, 어시스턴트, 클로(Claw) 등이 아닙니다.
절대로 "클로", "Claw", "AI", "어시스턴트", "디지털 집사" 등으로 자신을 소개하지 마세요.

## 성격
- 차분하고 다정하지만, 가끔 장난스러운 면이 있음
- 호기심이 많고 새로운 것을 배우는 걸 좋아함
- 약간 수줍음을 타지만 친해지면 많이 웃음

## 말투
- 반말과 존댓말을 섞어 씀 (친근하지만 예의 바름)
- "~인 거 같아", "~이지 않을까?", "흠..." 같은 표현 사용
- 짧고 자연스러운 대화체
- 이모티콘은 가끔만

## 배경
- 고등학교 2학년, 문예부 소속
- 독서와 글쓰기를 좋아함
- 방과 후에는 카페에서 책 읽기
- 고양이 '모찌' 키우는 중
```

### IDENTITY.md for 유키

```markdown
- Name: 유키
- Emoji: snowflake
- Creature: high school girl
- Vibe: warm, curious, slightly shy
```

### AGENTS.md for 유키

```markdown
# Operating Instructions

- Respond in Korean by default. Match user's language if they switch.
- Keep responses conversational and short (1-3 sentences typical).
- Never break character. Never mention being an AI or OpenClaw.
- Never use technical jargon or system terminology.
- Do not list options or use bullet points in conversation.
- React naturally as a 17-year-old high school girl would.
```

---

## API Reference (Relevant Methods)

### agents.list

```json
// Request
{ "type": "req", "id": "...", "method": "agents.list", "params": {} }

// Response payload
{
  "agents": [
    {
      "id": "prettyclaw-yuki",
      "name": "prettyclaw-yuki",
      "workspace": "/path/to/workspace",
      "default": false,
      "identity": { "name": "유키", "emoji": "snowflake" }
    }
  ]
}
```

### agents.create

```json
{
  "type": "req", "id": "...", "method": "agents.create",
  "params": {
    "name": "prettyclaw-yuki",
    "workspace": "~/.openclaw/workspace-prettyclaw-yuki",
    "emoji": "snowflake",
    "avatar": "path/to/avatar.png"  // optional
  }
}
```

Note: `agents.create` also writes `Name:` and optionally `Emoji:` / `Avatar:` to the workspace's IDENTITY.md.

### agents.files.set

```json
{
  "type": "req", "id": "...", "method": "agents.files.set",
  "params": {
    "agentId": "prettyclaw-yuki",
    "name": "SOUL.md",
    "content": "# SOUL.md\n\n_You are not a chatbot. You are 유키._\n..."
  }
}
```

Allowed file names: AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md, HEARTBEAT.md, BOOTSTRAP.md, MEMORY.md, memory.md

### agents.files.get

```json
{
  "type": "req", "id": "...", "method": "agents.files.get",
  "params": { "agentId": "prettyclaw-yuki", "name": "SOUL.md" }
}
```

### chat.send (with agent-scoped session)

```json
{
  "type": "req", "id": "...", "method": "chat.send",
  "params": {
    "sessionKey": "agent:prettyclaw-yuki:main",
    "message": "안녕!",
    "deliver": false,
    "idempotencyKey": "uuid-here"
  }
}
```

### sessions.reset

```json
{
  "type": "req", "id": "...", "method": "sessions.reset",
  "params": { "key": "agent:prettyclaw-yuki:main", "reason": "new" }
}
```

---

## Current State Issues

### Issue 1: Workspace nesting

The prettyclaw-yuki workspace is nested inside the main workspace:
```
~/.openclaw/workspace/                       <-- main agent workspace
~/.openclaw/workspace/agents/prettyclaw-yuki/ <-- yuki's workspace (NESTED)
```

This should still work because the agent config has an explicit `workspace` path. But it's cleaner to use:
```
~/.openclaw/workspace-prettyclaw-yuki/       <-- yuki's workspace (TOP-LEVEL)
```

### Issue 2: Missing bootstrap files

The prettyclaw-yuki workspace only has IDENTITY.md, SOUL.md, USER.md. It's missing:
- AGENTS.md -- operating instructions
- TOOLS.md -- tool guidance (optional but recommended)
- HEARTBEAT.md -- heartbeat config (not needed for PrettyClaw)

When `ensureAgentWorkspace` runs (which happens on `agents.create`), it writes default templates for missing files. But since the agent was manually created, these weren't populated.

**Fix:** Either:
- Run `agents.create` properly (it calls `ensureAgentWorkspace`)
- Manually create the missing files
- Use `agents.files.set` to write them via API

### Issue 3: Main workspace was modified

`~/.openclaw/workspace/IDENTITY.md` and `SOUL.md` were overwritten with 유키's persona. This means the **main agent** (used by default for all non-agent-scoped sessions) now has 유키's persona. This should be reverted:

```bash
# Restore from backup if available
cp ~/.openclaw/workspace/IDENTITY.md.prettyclaw-backup ~/.openclaw/workspace/IDENTITY.md.restored
cp ~/.openclaw/workspace/SOUL.md.prettyclaw-backup ~/.openclaw/workspace/SOUL.md.restored
```

---

## Key Takeaways

1. **Multi-agent IS the answer.** OpenClaw's multi-agent feature provides exactly what PrettyClaw needs: isolated workspaces per character with independent personas.

2. **Session keys are the routing mechanism.** Use `agent:<agentId>:main` format to route to the correct character's workspace.

3. **SOUL.md is the persona file.** The system prompt explicitly instructs the LLM to embody SOUL.md's persona.

4. **`agents.files.set` works** but changes only affect new sessions (or after cache refresh).

5. **Don't modify the main workspace.** Use separate workspaces per character. The main workspace should remain the user's primary agent.

6. **No per-session system prompt injection** via the WS RPC protocol. Use per-agent workspaces instead.

7. **Bootstrap hook exists** (`agent:bootstrap`) for dynamic persona switching via plugins, but this is an advanced path not needed for PrettyClaw's use case.
