use std::collections::BTreeMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// A launchable ACP agent: the command Codexia spawns and talks JSON-RPC to
/// over stdio.
///
/// Most CLIs do not speak ACP natively — they are reached through an adapter
/// package (`npx @agentclientprotocol/claude-agent-acp`, ...). A def therefore
/// describes
/// the *resolved* launcher, not the agent's own binary.
///
/// Codex is intentionally absent: Codexia drives it natively over
/// `codex app-server`, so routing it through an ACP adapter would be a downgrade.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcpAgentDef {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
    /// Whether `command` resolves on PATH. Only filled in by `list_agents`.
    #[serde(default)]
    pub available: bool,
    /// Whether the resolved launcher is the agent's own installed binary
    /// rather than the `npx` download fallback. `available` alone says only
    /// that *something* can be spawned: with Node present every npm-published
    /// agent is "available", which is not what a caller asking "is this agent
    /// installed?" means.
    #[serde(default)]
    pub local: bool,
}

/// One way to launch an agent. Presets list several, local binary first and
/// the `npx` adapter last, so an installed CLI beats a package download.
struct Launcher {
    command: &'static str,
    args: &'static [&'static str],
}

struct Preset {
    id: &'static str,
    name: &'static str,
    launchers: &'static [Launcher],
    env: &'static [(&'static str, &'static str)],
}

const fn l(command: &'static str, args: &'static [&'static str]) -> Launcher {
    Launcher { command, args }
}

const PRESETS: &[Preset] = &[
    Preset {
        id: "keke",
        name: "Keke",
        launchers: &[
            l("keke", &["agent", "stdio"]),
            l("npx", &["-y", "@milisp/keke@latest", "agent", "stdio"]),
        ],
        env: &[],
    },
    Preset {
        id: "claude",
        name: "Claude Code",
        launchers: &[
            l("claude-code-acp", &[]),
            l("npx", &["-y", "@agentclientprotocol/claude-agent-acp@latest"]),
        ],
        env: &[],
    },
    Preset {
        id: "grok",
        name: "Grok",
        launchers: &[l("grok", &["agent", "stdio"])],
        env: &[],
    },
    Preset {
        id: "gemini",
        name: "Gemini CLI",
        launchers: &[
            l("gemini", &["--acp"]),
            l("npx", &["-y", "@google/gemini-cli@latest", "--acp"]),
        ],
        env: &[],
    },
    Preset {
        id: "copilot",
        name: "GitHub Copilot",
        launchers: &[
            l("copilot", &["--acp"]),
            l("npx", &["-y", "@github/copilot-language-server@latest", "--acp"]),
        ],
        env: &[],
    },
    Preset {
        id: "qwen",
        name: "Qwen Code",
        launchers: &[
            l("qwen", &["--acp"]),
            l("npx", &["-y", "@qwen-code/qwen-code@latest", "--acp"]),
        ],
        env: &[],
    },
    Preset {
        id: "opencode",
        name: "OpenCode",
        launchers: &[
            l("opencode", &["acp"]),
            l("npx", &["-y", "opencode-ai@latest", "acp"]),
        ],
        env: &[],
    },
    Preset {
        id: "openclaw",
        name: "OpenClaw",
        launchers: &[l("openclaw", &["acp"]), l("npx", &["-y", "openclaw", "acp"])],
        env: &[],
    },
    Preset {
        id: "auggie",
        name: "Auggie CLI",
        launchers: &[
            l("auggie", &["--acp"]),
            l("npx", &["-y", "@augmentcode/auggie@latest", "--acp"]),
        ],
        env: &[("AUGMENT_DISABLE_AUTO_UPDATE", "1")],
    },
    Preset {
        id: "qoder",
        name: "Qoder CLI",
        launchers: &[
            l("qodercli", &["--acp"]),
            l("npx", &["-y", "@qoder-ai/qodercli@latest", "--acp"]),
        ],
        env: &[],
    },
    Preset {
        id: "kiro",
        name: "Kiro CLI",
        launchers: &[l("kiro-cli", &["acp"])],
        env: &[],
    },
    Preset {
        id: "hermes",
        name: "Hermes Agent",
        launchers: &[l("hermes", &["acp"])],
        env: &[],
    },
];

impl Preset {
    /// Pick the first launcher whose command is on PATH; fall back to the last
    /// one (marked unavailable) so the UI can still show what it would run.
    fn resolve(&self) -> AcpAgentDef {
        let found = self
            .launchers
            .iter()
            .find(|launcher| which::which(launcher.command).is_ok());
        let available = found.is_some();
        let launcher = found.unwrap_or_else(|| self.launchers.last().expect("preset launcher"));
        let local = available && launcher.command != "npx";

        AcpAgentDef {
            id: self.id.to_string(),
            name: self.name.to_string(),
            command: launcher.command.to_string(),
            args: launcher.args.iter().map(|a| a.to_string()).collect(),
            env: self
                .env
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            available,
            local,
        }
    }
}

/// User-defined agents, in the same shape ACP UI uses so configs are portable:
/// `{ "agents": { "My Agent": { "command": ..., "args": [...], "env": {...} } } }`
#[derive(Debug, Deserialize)]
struct UserAgentsFile {
    #[serde(default)]
    agents: BTreeMap<String, UserAgentEntry>,
}

#[derive(Debug, Deserialize)]
struct UserAgentEntry {
    command: String,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    env: BTreeMap<String, String>,
    /// Optional stable id; defaults to a slug of the display name.
    #[serde(default)]
    id: Option<String>,
}

pub fn user_agents_path() -> Option<PathBuf> {
    dirs::home_dir().map(|home| home.join(".plux").join("acp-agents.json"))
}

fn slug(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn user_agents() -> Vec<AcpAgentDef> {
    let Some(path) = user_agents_path() else {
        return Vec::new();
    };
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return Vec::new();
    };
    match serde_json::from_str::<UserAgentsFile>(&raw) {
        Ok(file) => file
            .agents
            .into_iter()
            .map(|(name, entry)| AcpAgentDef {
                id: entry.id.unwrap_or_else(|| slug(&name)),
                name,
                available: which::which(&entry.command).is_ok(),
                local: which::which(&entry.command).is_ok(),
                command: entry.command,
                args: entry.args,
                env: entry.env,
            })
            .collect(),
        Err(e) => {
            log::warn!("acp: ignoring {}: {e}", path.display());
            Vec::new()
        }
    }
}

/// Built-in presets resolved against PATH, with user-defined agents merged in.
/// A user entry sharing a preset's id replaces it.
pub fn list_agents() -> Vec<AcpAgentDef> {
    let mut agents: Vec<AcpAgentDef> = PRESETS.iter().map(Preset::resolve).collect();
    for user in user_agents() {
        match agents.iter().position(|a| a.id == user.id) {
            Some(idx) => agents[idx] = user,
            None => agents.push(user),
        }
    }
    agents
}

pub fn find_preset(id: &str) -> Option<AcpAgentDef> {
    list_agents().into_iter().find(|a| a.id == id)
}

/// The npm package a preset would otherwise download on every run, read off
/// its `npx` launcher so there is only one place naming a package. `None` for
/// an agent that has no npm distribution — those can only be installed by hand.
fn npm_package(id: &str) -> Option<&'static str> {
    let preset = PRESETS.iter().find(|p| p.id == id)?;
    let npx = preset.launchers.iter().find(|l| l.command == "npx")?;
    let package = npx.args.iter().find(|a| !a.starts_with('-'))?;
    Some(package)
}

/// Install a preset globally with npm, so it resolves on PATH from then on.
///
/// The `npx` fallback launcher means an agent can run without this, but only
/// by re-downloading the package on every spawn — and only when Node is
/// installed at all. This is the one-off that makes the agent local.
pub fn install_preset(id: &str) -> Result<AcpAgentDef, String> {
    let package = npm_package(id).ok_or_else(|| format!("{id} has no npm package to install"))?;
    let npm = which::which("npm")
        .map_err(|_| "npm was not found on PATH — install Node.js first.".to_string())?;

    log::info!("acp: installing {id} via npm install -g {package}");
    let output = std::process::Command::new(npm)
        .args(["install", "-g", package])
        .output()
        .map_err(|e| format!("could not run npm: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let message = stderr.trim();
        return Err(if message.is_empty() {
            format!("npm install -g {package} failed")
        } else {
            message.to_string()
        });
    }

    let def = find_preset(id).ok_or_else(|| format!("{id} is not a known agent"))?;
    log::info!(
        "acp: installed {id}: command={} local={} available={}",
        def.command,
        def.local,
        def.available
    );
    Ok(def)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn npm_package_comes_from_the_npx_launcher() {
        assert_eq!(npm_package("keke"), Some("@milisp/keke@latest"));
        // No npx launcher, so nothing to install for us.
        assert_eq!(npm_package("kiro"), None);
        assert_eq!(npm_package("nope"), None);
    }

    #[test]
    fn npx_fallback_is_not_a_local_install() {
        let def = AcpAgentDef {
            id: "keke".into(),
            name: "Keke".into(),
            command: "npx".into(),
            args: vec![],
            env: Default::default(),
            available: true,
            local: false,
        };
        assert!(def.available && !def.local);
    }
}
