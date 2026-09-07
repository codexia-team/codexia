## ✨ Added

- Bot tab with Keke-backed chats: list sessions, start new ones from the sidebar, pick workspace folder via Tauri file dialog, and configure provider/model through the ACP menu.
- Toast deduplication to prevent duplicate notifications stacking up.
- Web server now supports configuring extra CORS origins.
- Local file assets are now served over HTTP through the loopback web server.

## 🔄 Changed

- Routed all remaining desktop and filesystem calls through the loopback web server.
- Bot conversations are now scoped to each bot individually.
- Bot settings dialog opens automatically after creating a new bot.

## 🐛 Fixed

- Empty bot sessions no longer accumulate across restarts.
- Fixed close button clipping on toast notifications.
- Dev browser now opens only after the web server actually binds.
- Git diff now detects binary files and skips text diffing for them.
- Removed `noVoid` lint warnings in `BotSessionList`.
