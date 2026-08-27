<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Codexia Logo" width="120" height="120">

  <h1>Codexia</h1>

  <p>
    <strong>Lightweight Agent command center for Codex + Claude Code + ACP agents</strong>
  </p>

  <p>
    <a href="https://github.com/milisp/codexia/releases"><img src="https://img.shields.io/github/downloads/milisp/codexia/total.svg?style=for-the-badge&label=Downloads&color=2ea44f" alt="Downloads"></a>
    <a href="https://github.com/milisp/codexia/stargazers"><img src="https://img.shields.io/github/stars/milisp/codexia?style=for-the-badge&label=Stars&color=f1c40f" alt="Stars"></a>
    <a href="https://discord.gg/zAjtD4kf5K"><img src="https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="http://x.com/intent/follow?screen_name=lisp_mi"><img src="https://img.shields.io/badge/Follow-@lisp__mi-000000?style=for-the-badge&logo=x&logoColor=white" alt="Follow on X"></a>
  </p>

</div>

Lightweight Agent Workstation for Codex CLI + Claude Code + any Agent Client Protocol (ACP) agent — with task scheduler, git worktree & remote control, skills management, and a prompt notepad in one workspace

> 💡 **Maintained by [@milisp](https://github.com/milisp)** · **[Follow me on 𝕏](https://x.com/lisp_mi)** for agentic workflows, building in public, and project updates
> Sponsorship or custom work: [milisp@proton.me](mailto:milisp@proton.me)

![Codexia Home](https://github.com/user-attachments/assets/5be5e429-8524-4032-ba59-61ac6578cb0d)

## Features

- **Agent Client Protocol (ACP)**: Connect any external ACP agent — sessions persist across restarts, tool calls render live in the thread
- **Agent workflows**: Task Scheduler for recurring jobs, remote control via headless web server (including iOS)
- **Workspace**: Git worktree management, project file tree, IDE-like editor, prompt notepad, local web preview
- **Data tools**: One-click PDF / XLSX / CSV preview
- **Ecosystem**: MCP server marketplace, agent skills marketplace
- **Personalization**: Theme and accent customization, usage analytics dashboard

## Requirements

- [Codex CLI](https://github.com/openai/codex)
- [Claude Code CLI](https://claude.ai/code)
- Optional: any agent that speaks the [Agent Client Protocol](https://agentclientprotocol.com)

## Installation

### Homebrew (macOS)
```sh
brew install --cask codexia
```

### Scoop (Windows)
```powershell
scoop bucket add milisp https://github.com/milisp/scoop-bucket
scoop install codexia
```

### Prebuilt releases (macOS / Linux / Windows)
- [GitHub Releases](https://github.com/milisp/codexia/releases)

Windows also ships a portable archive (`codexia_<version>_x64_portable.zip`) that
runs without installing.

## Quick Start

1. Launch Codexia.
2. Add your project directory.
3. Enter a prompt and start your agent session.
4. Create an Agent Task Scheduler job for recurring workflows.

## Also by me

- [Plux](https://milisp.dev/plux) - Capture now with a shortcut. Turn it into a todo, send it to AI anytime.

## Recommend tools

- [keke](https://github.com/milisp/keke-agent) - Local terminal coding agent with zero-vendor lock-in. Works with subscriptions, API keys, or self-hosted models; speaks ACP for editor/client integration
- [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) - Your codex is not alone. Add hooks, agent teams, HUDs, and so much more.
- [rtc](https://github.com/rtk-ai/rtk) - CLI proxy that reduces LLM token consumption by 60-90% on common dev commands. Single Rust binary, zero dependencies
- [ctx](https://github.com/ctxrs/ctx) - Search the coding agent history already on your machine

## Architecture at a Glance
- Codex app-server integration
- Claude agent rust sdk integration
- Agent Client Protocol (ACP) client for external agents, with persisted sessions
- Frontend: React + TypeScript + Zustand + shadcn/ui in `src/`
- Desktop backend: Tauri v2 + Rust in `src-tauri/src/`
- Headless backend: Axum web server for remote control in `web/`
- Agent runtime: Codex `app-server` JSON-RPC integration for session/turn lifecycle
- Real-time updates: WebSocket broadcast stream at `/ws` for browser clients

Core entry points:
- `src-tauri/src/lib.rs` (desktop commands and state)
- `web/src/server_web.rs` (headless server startup)
- `src-tauri/src/web/router.rs` (HTTP API route surface)
- `src/services/tauri/` (frontend invoke layer)

## API Surface
Codexia exposes a browser-accessible API when running in web/headless mode:

- Health and stream: `GET /health`, `GET /ws`
- Codex lifecycle: `/api/codex/thread/*`, `/api/codex/turn/*`, `/api/codex/model/*`, `/api/codex/approval/*`
- Automation scheduler: `/api/automation/*` (create/update/list/run/pause/delete)
- Files, git, and terminal: `/api/filesystem/*`, `/api/git/*`, `/api/terminal/*`
- Claude integration: `/api/cc/*`
- Notes and productivity: `/api/notes/*`, `/api/codex/usage/token`

Contributor note:
- Add new API handlers under `./web/src/handlers/`
- Register routes in `./web/src/router.rs`
- Add corresponding frontend client calls in `src/services/tauri/`

## Documentation

- [Usage](docs/USAGE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Web Server](docs/WEB_SERVER.md)

## 🔒 Security

- **Process isolation**: Agents run in separate processes
- **Permission control**: Configure file and network access per agent
- **Local storage**: All data stays on your machine
- **Open source**: Full transparency through open source code

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow.

Community forks:
- [jeremiahodom/codex-ui](https://github.com/jeremiahodom/codex-ui) — Node.js backend with API/SSE
- [nuno5645/codexia](https://github.com/nuno5645/codexia) — Reasoning and token count events

Related:
- [awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) — curated list of Codex CLI resources

## Community

- [GitHub Discussions](https://github.com/milisp/codexia/discussions)
- [Report Bug / Request Feature](https://github.com/milisp/codexia/issues)

## License

Licensed under the [MIT License](LICENSE).
