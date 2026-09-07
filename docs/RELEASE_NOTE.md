## 🐛 Fixed

- Packaged desktop builds now restore the user's full shell environment, not just `PATH` — agents that read API keys straight from the environment (e.g. keke) no longer fail with a bare "Internal error" when the key is only exported in the shell rc.
- Agent error messages are now unwrapped correctly when the reason comes back as a plain string (as keke sends it) instead of only `{ details }`.
- Agent stderr and API 500s are now logged in release builds, instead of silently disappearing.
- The loopback API server now retries binding its port for a few seconds instead of giving up immediately when a just-exited previous process hasn't released it yet.
- Resuming a bot's stored session now falls back to a fresh session instead of failing to open the bot entirely when the agent can't actually load it.
