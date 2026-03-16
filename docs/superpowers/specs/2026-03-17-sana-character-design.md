# Sana Character Design

**Goal**

기존 `Sana` 자산을 재사용해서 PrettyClaw에 `Sana / 사나 / 紗奈`를 전체 캐릭터로 추가한다. 앱 기본 템플릿과 `prettyclaw init` bootstrap 경로 모두 지원해야 한다.

**Scope**

- `config/characters.en.template.json`
- `config/characters.ko.template.json`
- `config/characters.ja.template.json`
- `config/characters.template.json`
- `config/agents/{en,ko,ja}/sana/{IDENTITY,SOUL}.md`
- 관련 `node:test`

범위 밖:

- 로더 스키마 확장
- 기존 Yuki 데이터 구조 변경
- 스프라이트 오버레이 추가

**Design**

- 이미 존재하는 자산을 그대로 사용한다.
  - `/characters/sana-avatar.png`
  - `/characters/sana-sprite.png`
  - `/backgrounds/sana-room.png`
- Sana는 각 locale 템플릿에서 두 번째 캐릭터로 추가한다.
- 캐릭터 컨셉은 사용자가 지정한 기본안대로 `활발한 누나 타입`으로 작성한다.
- `agentId`와 `sessionKey`는 모두 `prettyclaw-sana`로 고정한다.
- 테마 색상은 기존 테스트 fixture에 있던 `#d79a63` / `#f2c896`를 재사용한다.
- TTS는 현재 구조와 호환되도록 locale별 Edge TTS 설정을 넣는다.
  - `en`: `en-US-JennyNeural`, `rate: "+5%"`
  - `ko`: `ko-KR-SunHiNeural`, `rate: "+5%"`
  - `ja`: `ja-JP-NanamiNeural`, `rate: "+5%"`
- `config/agents/{locale}/sana/*`는 package template source이며, `prettyclaw init`가 이를 `~/.config/prettyclaw/agents/sana/{locale}/`로 복사한 뒤 bootstrap에서 읽는다.

**Testing**

- 실제 repository locale 템플릿이 Sana를 포함하는지 검증한다.
- 실제 repository locale 프롬프트 템플릿이 Sana용 `SOUL.md`/`IDENTITY.md`를 모두 가지는지 검증한다.
- `initPrettyClaw`가 `characters.<locale>.json`과 locale별 Sana prompt 파일을 로컬 config 경로로 seed하는지 검증한다.

**Risks**

- `config/characters.template.json`은 현재 runtime 경로에서 직접 사용되지 않지만, 저장소 문서에는 여전히 언급된다.
- locale 템플릿에만 추가하면 runtime은 동작하지만, 향후 문서/CLI 보조 로직과의 불일치가 생길 수 있다.

**Decision**

- 이번 변경은 runtime 기준 최소 변경을 우선한다.
- 동시에 `config/characters.template.json`도 같은 Sana 항목으로 맞춰 저장소 문서와 테스트 경로를 일관되게 유지한다.
