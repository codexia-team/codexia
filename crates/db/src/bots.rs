use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

/// A bot: a named, long-lived agent you message like a colleague.
///
/// Everything here is Codexia's own. The runtime it drives (`keke agent stdio`)
/// has no concept of a named agent, so identity, persona and tool selection are
/// stored on this side and translated into spawn arguments and ACP config
/// options when a conversation starts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BotRecord {
    pub id: String,
    pub name: String,
    /// One-line role, shown under the name.
    pub title: Option<String>,
    /// Emoji drawn on the avatar circle.
    pub avatar: String,
    /// Hex background of the avatar circle.
    pub color: String,
    /// Which ACP agent backs the bot. Always `keke` today; stored so another
    /// preset can be offered without a migration.
    pub agent_id: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub reasoning_effort: Option<String>,
    pub cwd: String,
    /// The persona, handed to keke as `KEKE_INSTRUCTIONS`.
    pub system_prompt: Option<String>,
    /// `read_only` | `ask` | `autonomous`.
    pub trust_level: String,
    /// Tool names this bot's owner has already approved for good, as a JSON
    /// array. ACP's own `allow-always` only lasts a session, so the standing
    /// answer is kept here instead.
    pub approved_tools: String,
    /// Servers to hand this bot at `session/new`, as a JSON array of names.
    /// Per-conversation rather than per-installation, which is the only place
    /// ACP lets a client name them.
    pub mcp_servers: String,
    pub pinned: bool,
    pub archived: bool,
    pub notifications_enabled: bool,
    pub unread_count: i64,
    pub last_viewed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// The fields a caller may change. Anything left `None` keeps its stored value,
/// so a dialog that edits one field does not have to send the whole record back.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BotPatch {
    pub name: Option<String>,
    pub title: Option<String>,
    pub avatar: Option<String>,
    pub color: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub reasoning_effort: Option<String>,
    pub cwd: Option<String>,
    pub system_prompt: Option<String>,
    pub trust_level: Option<String>,
    pub approved_tools: Option<Vec<String>>,
    pub mcp_servers: Option<Vec<String>>,
    pub pinned: Option<bool>,
    pub archived: Option<bool>,
    pub notifications_enabled: Option<bool>,
    pub unread_count: Option<i64>,
    pub last_viewed_at: Option<String>,
}

const COLUMNS: &str = "id, name, title, avatar, color, agent_id, provider, model, \
     reasoning_effort, cwd, system_prompt, trust_level, approved_tools, mcp_servers, \
     pinned, archived, notifications_enabled, unread_count, \
     last_viewed_at, created_at, updated_at";

fn row_to_bot(row: &rusqlite::Row<'_>) -> rusqlite::Result<BotRecord> {
    Ok(BotRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        title: row.get(2)?,
        avatar: row.get(3)?,
        color: row.get(4)?,
        agent_id: row.get(5)?,
        provider: row.get(6)?,
        model: row.get(7)?,
        reasoning_effort: row.get(8)?,
        cwd: row.get(9)?,
        system_prompt: row.get(10)?,
        trust_level: row.get(11)?,
        approved_tools: row.get(12)?,
        mcp_servers: row.get(13)?,
        pinned: row.get(14)?,
        archived: row.get(15)?,
        notifications_enabled: row.get(16)?,
        unread_count: row.get(17)?,
        last_viewed_at: row.get(18)?,
        created_at: row.get(19)?,
        updated_at: row.get(20)?,
    })
}

/// A JSON array of strings, as the list columns are stored. An unreadable
/// column reads as empty rather than failing the whole record: a bot with a
/// corrupt tool list is still a bot you can open and fix.
pub fn parse_list(raw: &str) -> Vec<String> {
    serde_json::from_str(raw).unwrap_or_default()
}

fn encode_list(list: &[String]) -> String {
    serde_json::to_string(list).unwrap_or_else(|_| "[]".to_string())
}

#[allow(clippy::too_many_arguments)]
pub fn create_bot(
    id: &str,
    name: &str,
    avatar: &str,
    color: &str,
    agent_id: &str,
    cwd: &str,
    trust_level: &str,
) -> Result<BotRecord, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO bots (
            id, name, title, avatar, color, agent_id, provider, model, reasoning_effort,
            cwd, system_prompt, trust_level, approved_tools, mcp_servers,
            pinned, archived, notifications_enabled, unread_count, last_viewed_at,
            created_at, updated_at
        ) VALUES (
            ?1, ?2, NULL, ?3, ?4, ?5, NULL, NULL, NULL,
            ?6, NULL, ?7, '[]', '[]',
            0, 0, 1, 0, NULL,
            ?8, ?8
        )",
        params![id, name, avatar, color, agent_id, cwd, trust_level, now],
    )
    .map_err(|e| format!("Failed to create bot: {}", e))?;

    get_bot(id)?.ok_or_else(|| "Failed to read back the created bot".to_string())
}

pub fn get_bot(id: &str) -> Result<Option<BotRecord>, String> {
    let conn = get_connection()?;
    let mut stmt = conn
        .prepare(&format!("SELECT {COLUMNS} FROM bots WHERE id = ?1"))
        .map_err(|e| format!("Failed to prepare bot query: {}", e))?;
    let mut rows = stmt
        .query_map(params![id], row_to_bot)
        .map_err(|e| format!("Failed to query bot: {}", e))?;
    match rows.next() {
        Some(row) => Ok(Some(
            row.map_err(|e| format!("Failed to read bot: {}", e))?,
        )),
        None => Ok(None),
    }
}

/// Every bot, pinned first and then by most recent activity — the order the
/// sidebar shows them in. Reading this must never start an agent process, so
/// it answers from the table alone.
pub fn list_bots(include_archived: bool) -> Result<Vec<BotRecord>, String> {
    let conn = get_connection()?;
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {COLUMNS} FROM bots
             WHERE (?1 = 1 OR archived = 0)
             ORDER BY pinned DESC, updated_at DESC"
        ))
        .map_err(|e| format!("Failed to prepare bot list query: {}", e))?;

    let rows = stmt
        .query_map(params![include_archived as i64], row_to_bot)
        .map_err(|e| format!("Failed to query bots: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read bots: {}", e))
}

/// Apply the fields the caller set. `updated_at` moves only when something
/// actually changed, so opening a bot does not reorder the sidebar.
pub fn update_bot(id: &str, patch: &BotPatch) -> Result<BotRecord, String> {
    let conn = get_connection()?;

    let mut sets: Vec<&str> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    macro_rules! set {
        ($field:ident, $column:literal) => {
            if let Some(value) = patch.$field.clone() {
                sets.push(concat!($column, " = ?"));
                values.push(Box::new(value));
            }
        };
    }
    macro_rules! set_list {
        ($field:ident, $column:literal) => {
            if let Some(list) = &patch.$field {
                sets.push(concat!($column, " = ?"));
                values.push(Box::new(encode_list(list)));
            }
        };
    }

    set!(name, "name");
    set!(title, "title");
    set!(avatar, "avatar");
    set!(color, "color");
    set!(provider, "provider");
    set!(model, "model");
    set!(reasoning_effort, "reasoning_effort");
    set!(cwd, "cwd");
    set!(system_prompt, "system_prompt");
    set!(trust_level, "trust_level");
    set_list!(approved_tools, "approved_tools");
    set_list!(mcp_servers, "mcp_servers");
    set!(pinned, "pinned");
    set!(archived, "archived");
    set!(notifications_enabled, "notifications_enabled");
    set!(unread_count, "unread_count");
    set!(last_viewed_at, "last_viewed_at");

    if !sets.is_empty() {
        sets.push("updated_at = ?");
        values.push(Box::new(Utc::now().to_rfc3339()));
        values.push(Box::new(id.to_string()));

        let sql = format!("UPDATE bots SET {} WHERE id = ?", sets.join(", "));
        let refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&sql, refs.as_slice())
            .map_err(|e| format!("Failed to update bot: {}", e))?;
    }

    get_bot(id)?.ok_or_else(|| format!("No bot with id `{id}`"))
}

/// Remove the bot and every conversation belonging to it, transcripts included.
pub fn delete_bot(id: &str) -> Result<(), String> {
    let conn = get_connection()?;
    conn.execute(
        "DELETE FROM acp_session_updates WHERE session_id IN
         (SELECT session_id FROM acp_sessions WHERE bot_id = ?1)",
        params![id],
    )
    .map_err(|e| format!("Failed to delete bot transcripts: {}", e))?;
    conn.execute("DELETE FROM acp_sessions WHERE bot_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete bot sessions: {}", e))?;
    conn.execute("DELETE FROM bots WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete bot: {}", e))?;
    Ok(())
}
