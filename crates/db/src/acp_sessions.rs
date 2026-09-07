use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

/// A persisted ACP session, as listed in the sidebar.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcpSessionRecord {
    pub session_id: String,
    pub agent_id: String,
    pub agent_title: Option<String>,
    pub cwd: String,
    /// The bot this conversation belongs to, when it was opened from the Bot
    /// tab. `None` for the ordinary per-project ACP sessions.
    pub bot_id: Option<String>,
    /// First user message of the session, used as the list label.
    pub title: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Record a session as soon as `session/new` succeeds, so it shows up in the
/// list even before the first prompt. Re-recording an existing session (on
/// resume) leaves `updated_at` alone, so merely opening a session does not
/// move it to the top of the list.
pub fn upsert_session(
    session_id: &str,
    agent_id: &str,
    agent_title: Option<&str>,
    cwd: &str,
    bot_id: Option<&str>,
) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO acp_sessions (
            session_id, agent_id, agent_title, cwd, bot_id, title, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?6)
        ON CONFLICT(session_id) DO UPDATE SET
            agent_id = excluded.agent_id,
            agent_title = excluded.agent_title,
            cwd = excluded.cwd,
            bot_id = excluded.bot_id",
        params![session_id, agent_id, agent_title, cwd, bot_id, now],
    )
    .map_err(|e| format!("Failed to upsert ACP session: {}", e))?;

    // Each bot restart produces a new empty session. Clean up the previous
    // ones now, while we hold a connection, so they never accumulate.
    // Only bot sessions need this (non-bot sessions have bot_id = NULL).
    if let Some(bid) = bot_id {
        conn.execute(
            "DELETE FROM acp_session_updates WHERE session_id IN (
                SELECT session_id FROM acp_sessions
                WHERE bot_id = ?1 AND title IS NULL AND session_id != ?2
            )",
            params![bid, session_id],
        )
        .map_err(|e| format!("Failed to prune empty bot session updates: {}", e))?;
        conn.execute(
            "DELETE FROM acp_sessions WHERE bot_id = ?1 AND title IS NULL AND session_id != ?2",
            params![bid, session_id],
        )
        .map_err(|e| format!("Failed to prune empty bot sessions: {}", e))?;
    }

    Ok(())
}

/// Append one transcript entry, stored as the raw `session/update` payload.
/// Also bumps `updated_at`, and fills the title from the first user message.
pub fn append_update(session_id: &str, payload: &str) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO acp_session_updates (session_id, payload, created_at) VALUES (?1, ?2, ?3)",
        params![session_id, payload, now],
    )
    .map_err(|e| format!("Failed to append ACP session update: {}", e))?;
    conn.execute(
        "UPDATE acp_sessions SET updated_at = ?1 WHERE session_id = ?2",
        params![now, session_id],
    )
    .map_err(|e| format!("Failed to touch ACP session: {}", e))?;
    Ok(())
}

/// Set the session label, keeping the first one that was written.
pub fn set_title_if_empty(session_id: &str, title: &str) -> Result<(), String> {
    let conn = get_connection()?;
    let title: String = title.chars().take(120).collect();
    conn.execute(
        "UPDATE acp_sessions SET title = ?1 WHERE session_id = ?2 AND (title IS NULL OR title = '')",
        params![title, session_id],
    )
    .map_err(|e| format!("Failed to set ACP session title: {}", e))?;
    Ok(())
}

/// Sessions for `cwd`, or all of them when `cwd` is `None`, newest first.
/// Bot conversations are left out: they belong to a bot, not to a project, and
/// listing them beside the project's own sessions would show each twice.
pub fn list_sessions(cwd: Option<&str>, limit: usize) -> Result<Vec<AcpSessionRecord>, String> {
    let conn = get_connection()?;
    let limit = if limit == 0 { 100 } else { limit.min(500) } as i64;

    let mut stmt = conn
        .prepare(
            "SELECT session_id, agent_id, agent_title, cwd, bot_id, title, created_at, updated_at
             FROM acp_sessions
             WHERE (?1 IS NULL OR cwd = ?1) AND bot_id IS NULL
             ORDER BY updated_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("Failed to prepare ACP session list query: {}", e))?;

    let rows = stmt
        .query_map(params![cwd, limit], |row| {
            Ok(AcpSessionRecord {
                session_id: row.get(0)?,
                agent_id: row.get(1)?,
                agent_title: row.get(2)?,
                cwd: row.get(3)?,
                bot_id: row.get(4)?,
                title: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query ACP sessions: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read ACP sessions: {}", e))
}

/// One bot's conversations, newest first. Reads the table only — the sidebar
/// must be able to show a bot without waking its agent process.
pub fn list_bot_sessions(bot_id: &str, limit: usize) -> Result<Vec<AcpSessionRecord>, String> {
    let conn = get_connection()?;
    let limit = if limit == 0 { 100 } else { limit.min(500) } as i64;

    let mut stmt = conn
        .prepare(
            "SELECT session_id, agent_id, agent_title, cwd, bot_id, title, created_at, updated_at
             FROM acp_sessions
             WHERE bot_id = ?1 AND title IS NOT NULL
             ORDER BY updated_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("Failed to prepare bot session list query: {}", e))?;

    let rows = stmt
        .query_map(params![bot_id, limit], |row| {
            Ok(AcpSessionRecord {
                session_id: row.get(0)?,
                agent_id: row.get(1)?,
                agent_title: row.get(2)?,
                cwd: row.get(3)?,
                bot_id: row.get(4)?,
                title: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query bot sessions: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read bot sessions: {}", e))
}

/// The stored transcript, in arrival order. Each item is a `session/update`
/// payload the frontend replays through its normal update handler.
pub fn get_updates(session_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let conn = get_connection()?;
    let mut stmt = conn
        .prepare(
            "SELECT payload FROM acp_session_updates WHERE session_id = ?1 ORDER BY id ASC",
        )
        .map_err(|e| format!("Failed to prepare ACP transcript query: {}", e))?;

    let rows = stmt
        .query_map(params![session_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query ACP transcript: {}", e))?;

    let mut updates = Vec::new();
    for row in rows {
        let payload = row.map_err(|e| format!("Failed to read ACP transcript: {}", e))?;
        if let Ok(value) = serde_json::from_str(&payload) {
            updates.push(value);
        }
    }
    Ok(updates)
}

pub fn delete_session(session_id: &str) -> Result<(), String> {
    let conn = get_connection()?;
    conn.execute(
        "DELETE FROM acp_session_updates WHERE session_id = ?1",
        params![session_id],
    )
    .map_err(|e| format!("Failed to delete ACP transcript: {}", e))?;
    conn.execute(
        "DELETE FROM acp_sessions WHERE session_id = ?1",
        params![session_id],
    )
    .map_err(|e| format!("Failed to delete ACP session: {}", e))?;
    Ok(())
}
