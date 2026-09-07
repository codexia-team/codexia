# Changelogs

One file per release, newest first. Read the file for the version you care about
rather than scanning everything.

| Version | Date | Notes |
| --- | --- | --- |
| [0.50.0](./0.50.0.md) | 2026-09-07 | Bot tab with Keke chats, toast deduplication, loopback web server for desktop/fs calls |
| [0.49.0](./0.49.0.md) | 2026-09-07 | File explorer PDF/XLSX/DOCX/PPTX preview, sonner toasts, cargo-watch justfile |
| [0.48.2](./0.48.2.md) | 2026-08-27 | ACP model/auth controls split into AcpModelMenu, Keke as default ACP preset |
| [0.48.1](./0.48.1.md) | 2026-08-19 | Localized codex thread items, file change and message layout fixes |
| [0.48.0](./0.48.0.md) | 2026-08-19 | Codex saved account switcher, todos panel, update indicator highlight |
| [0.47.1](./0.47.1.md) | 2026-08-18 | Codex permission escalation and MCP elicitation prompts, provider env vars |
| [0.47.0](./0.47.0.md) | 2026-08-18 | New Lexical composer with slash commands, user-managed providers, MCP OAuth, plugin search |
| [0.46.0](./0.46.0.md) | 2026-08-16 | Ghibli theme, open-app support, MIT relicense, PostHog removed |
| [0.45.0](./0.45.0.md) | 2026-08-16 | Tauri iOS app with mobile shell, multiple paired desktops, multi-session ACP connections |
| [0.44.0](./0.44.0.md) | 2026-08-10 | Claude Code effort levels and permission modes, automation runner, Windows portable archive |
| [0.43.0](./0.43.0.md) | 2026-08-09 | ACP agent connections, iOS remote control, Grok approval toggle |
| [0.42.2](./0.42.2.md) | 2026-07-31 | Multi-tabbed right panel, git revert in file change summaries |
| [0.42.0](./0.42.0.md) | 2026-07-27 | Plugins marketplace, on-device dictation, OpenAI API key auth |

## Older releases

Releases up to and including 0.36.0 live in the root [CHANGELOG.md](../CHANGELOG.md),
which is kept as a frozen archive and is no longer updated. Versions 0.37.0
through 0.41.1 were released without written changelogs; use
`git log v0.36.0..v0.42.0` for that range.

## Conventions

- File name is the version: `<major>.<minor>.<patch>.md`.
- Heading is `# <version> - <YYYY-MM-DD>`, followed by a compare link to the previous release.
- Sections, in this order, omitting any that are empty: `Added`, `Changed`,
  `Deprecated`, `Removed`, `Fixed`, `Security`, `Internal`.
- Entries describe what changed for the user, not how it was implemented.
  Commit hashes go in trailing parentheses.
- Changes with no user-visible effect (formatting, tooling, dependency bumps)
  are summarized in a single `Internal` paragraph, not itemized.
- `docs/RELEASE_NOTE.md` holds the prose release note for the *current* release
  only; the release workflow publishes it as the GitHub release body.
