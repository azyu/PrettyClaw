# PrettyClaw I18n Research

Research date: 2026-03-15
Purpose: Select an internationalization strategy for PrettyClaw with `en`, `ko`, and `ja` support.

## Requirements

- Framework context: Next.js 16 App Router, React 19, TypeScript strict mode
- Supported locales: `en`, `ko`, `ja`
- Default fallback locale: `en`
- Locale routing: no locale URL prefixes
- Locale persistence: app state + client-side persistence
- Character content: keep as locale-specific flat files outside the UI i18n layer
- Migration: no runtime localization layer for character metadata

## Decision Summary

PrettyClaw should use `next-intl`.

Why:

- It fits App Router and Server/Client Component boundaries cleanly.
- It supports message catalogs, typed usage patterns, and locale-aware formatting without forcing locale-prefixed routes.
- It keeps the implementation smaller than combining `react-i18next` with extra App Router routing glue.
- It is more mature than the lighter Next.js-specific alternatives we reviewed.

## Evaluation Criteria

1. App Router fit without adding locale-prefixed URLs
2. Clear server/client integration for metadata, formatting, and component rendering
3. Low implementation complexity for a small app
4. Healthy maintenance signal on GitHub
5. Clear separation between UI i18n and locale-specific character files

## Candidate Comparison

| Library | GitHub | Stars | Last Updated | Fit for PrettyClaw | Notes |
|---|---|---:|---|---|---|
| `next-intl` | `amannn/next-intl` | 4,169 | 2026-03-14 | Best fit | Next.js-focused, App Router support, formatting support, works without committing to locale URL prefixes |
| `next-international` | `QuiiBz/next-international` | 1,449 | 2026-03-10 | Viable fallback | Lighter and type-safe, but smaller ecosystem and less battle-tested than `next-intl` |
| `react-i18next` | `i18next/react-i18next` | 9,922 | 2026-03-15 | Possible but heavier | Strong ecosystem, but Next App Router setup is more compositional and adds routing/integration choices |
| `next-i18n-router` | `i18nexus/next-i18n-router` | 330 | 2026-03-10 | Not selected | Useful if adopting route-based locale handling, which PrettyClaw explicitly does not want |
| `Lingui` | `lingui/js-lingui` | 5,638 | 2026-03-14 | Overkill for now | Good extraction/catalog workflow, but adds process weight that this codebase does not need yet |

## Chosen Strategy

### Library

Use `next-intl` for message catalogs, locale context, and locale-aware formatting.

### Locale Model

- Do not use locale-prefixed routes such as `/en/...` or `/ja/...`.
- Keep locale in application state and persist it on the client.
- Resolve the initial locale from persisted client preference first, then browser language, then fallback to `en`.

### Character Data Model

Keep `next-intl` focused on UI/UX. Character-facing text, TTS settings, and persona prompts stay in locale-specific flat files selected by local config and bootstrap.

## Why `next-intl` Won

### 1. Best match for App Router

PrettyClaw already depends on App Router behavior and server-rendered layout metadata. `next-intl` is designed around that model, so it does not require forcing a different app structure.

### 2. Route prefixes are optional

Many Next.js i18n examples assume locale segments in the URL. PrettyClaw does not want that. `next-intl` can still be used as the translation and formatting layer while locale selection lives in app state and client persistence.

### 3. Good balance of structure and weight

`react-i18next` is flexible, but that flexibility becomes integration work in App Router. `next-international` is simpler, but `next-intl` gives a more complete solution for formatting and long-term maintenance without pushing the app into a heavy extraction workflow.

### 4. Keeps UI i18n separate from character content

This project still needs locale-aware UI and formatting, but character display text and prompt files are simpler when they stay as flat locale-specific files on disk. `next-intl` remains a good fit because it does not force the app to push every localized concern through the same runtime layer.

## Rejected Options

### `next-international`

Strong lightweight alternative, but not the first choice here. PrettyClaw benefits more from the more established documentation and ecosystem around `next-intl`.

### `react-i18next`

Technically viable, but it pushes more integration decisions onto the app. That is a poor trade for a small codebase that wants a direct App Router fit.

### `react-i18next` + `next-i18n-router`

This stack is mainly attractive when route-based locale handling is part of the product requirement. PrettyClaw explicitly does not want locale URL prefixes, so this adds parts without solving a real need.

### `Lingui`

Good choice when catalog extraction and localization workflows are already formalized. PrettyClaw is not there yet, so the extra tooling would be process overhead.

## Implementation Notes Captured by This Research

- Locale state should be owned by the app, not by the URL.
- Server-rendered metadata still needs locale awareness even without route prefixes.
- Character loaders should resolve locale-specific file paths before falling back to non-localized files.
- UI locale changes should not be treated as the source of truth for character metadata.

## Sources

GitHub repositories:

- `next-intl`: https://github.com/amannn/next-intl
- `next-international`: https://github.com/QuiiBz/next-international
- `react-i18next`: https://github.com/i18next/react-i18next
- `next-i18n-router`: https://github.com/i18nexus/next-i18n-router
- `Lingui`: https://github.com/lingui/js-lingui

Official docs:

- Next.js internationalization docs: https://nextjs.org/docs/app/building-your-application/routing/internationalization
- `next-intl` docs: https://next-intl.dev/docs/getting-started/app-router
- `next-international` docs: https://next-international.vercel.app
- `react-i18next` docs: https://react.i18next.com
- `Lingui` docs: https://lingui.dev
