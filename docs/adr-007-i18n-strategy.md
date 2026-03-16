# ADR-007: Internationalization Strategy

- Status: Accepted
- Date: 2026-03-15

## Context

PrettyClaw currently mixes Korean and English user-facing strings. The next iteration needs first-class support for English, Korean, and Japanese across UI copy and locale-sensitive formatting without turning character metadata into a runtime i18n concern.

The project does not want locale-prefixed URLs. Locale selection should behave like an application preference, not like route state. Character configuration and agent prompts should instead be authored as locale-specific flat files chosen during bootstrap and by local config.

## Decision

PrettyClaw will adopt the following i18n strategy:

1. Use `next-intl` as the i18n library.
2. Support exactly three locales: `en`, `ko`, and `ja`.
3. Use `en` as the default fallback locale.
4. Do not add locale URL prefixes or locale route segments.
5. Store the active locale in app state and client persistence.
6. Resolve the initial locale from persisted client preference first, then browser language, then fallback to `en`.
7. Keep i18n scoped to UI/UX and formatting concerns.
8. Store character metadata and prompt files as locale-specific flat files selected by local config.

## Decision Details

### Locale Handling

- Locale is an app preference, not part of the route.
- Client persistence is the source used to restore the last active locale.
- Browser language detection is only used when no persisted locale exists.
- The fallback locale for unresolved or unsupported values is always `en`.

### Character Files

Character metadata remains flat per file, and locale selection happens at the file-path level.

- `~/.config/prettyclaw/config.json` stores the selected language
- `~/.config/prettyclaw/characters.<locale>.json` is preferred over `characters.json`
- `~/.config/prettyclaw/agents/<id>/<locale>/SOUL.md` and `IDENTITY.md` are preferred over non-localized paths

## Consequences

### Positive

- UI translation and locale-aware formatting can be implemented with a library that fits Next.js App Router well.
- The app keeps clean URLs because locale does not leak into routing.
- UI copy and formatting can change independently without mutating character content at runtime.
- Character metadata and prompt sources stay simple flat files.

### Negative

- Locale cannot be shared via URL alone because it is not route-based.
- Locale-specific character files must be authored explicitly instead of relying on one runtime-localized schema.

### Follow-On Work

- Add i18n runtime/provider wiring with `next-intl`
- Move UI strings into locale catalogs
- Add locale switcher UI and persistence
- Update character loading and bootstrap to consume locale-specific flat files

## Alternatives Considered

- `next-international`: lighter, but not chosen over `next-intl`
- `react-i18next`: more flexible, but more integration overhead for this App Router project
- `react-i18next` with route helpers: rejected because locale-prefixed URLs are out of scope
- `Lingui`: strong extraction workflow, but too heavy for the current project stage

## References

- [i18n-research.md](./i18n-research.md)
- [references.md](./references.md)
