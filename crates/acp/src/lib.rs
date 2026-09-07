//! Generic Agent Client Protocol (ACP) client.
//!
//! Speaks JSON-RPC 2.0 over a child process' stdio, so any ACP-capable agent
//! (Gemini CLI, Hermes, Claude Code ACP, ...) can be driven from one UI.

pub mod agents;
pub mod client;
pub mod state;

pub use agents::{AcpAgentDef, find_preset, install_preset, list_agents};
/// Persisted session list and transcripts, stored by the client as it runs.
pub use codexia_db::acp_sessions::{
    AcpSessionRecord, delete_session, get_updates, list_sessions,
};
pub use client::{ACP_EVENT, AcpClient};
pub use state::{AcpStartResult, AcpState};
