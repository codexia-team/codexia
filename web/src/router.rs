use axum::{
    Router, middleware,
    http::{Method, header},
    routing::{get, post},
};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use super::{
    handlers::{
        api_account_rate_limits, api_allow_sleep, api_archive_thread, api_unarchive_thread, api_canonicalize_path,
        api_acp_list_agents, api_acp_start, api_acp_prompt, api_acp_cancel,
        api_acp_authenticate, api_acp_new_session, api_acp_respond_permission, api_acp_stop,
        api_acp_set_mode, api_acp_set_model, api_acp_set_config_option,
        api_acp_load_session, api_acp_list_sessions, api_acp_get_session, api_acp_delete_session,
        api_cc_list_projects, api_cc_mcp_add, api_cc_mcp_disable, api_cc_mcp_enable,
        api_cc_mcp_get, api_cc_mcp_list, api_cc_mcp_remove,
        api_cc_connect, api_cc_disconnect, api_cc_get_installed_skills,
        api_cc_delete_session, api_cc_get_session_messages, api_cc_list_sessions, api_cc_get_settings, api_cc_get_slash_commands,
        api_cc_interrupt,
        api_cc_new_session, api_cc_resolve_permission, api_cc_resume_session,
        api_cc_send_message, api_cc_set_permission_mode, api_cc_update_settings,
        api_create_automation, api_delete_automation, api_list_automation_runs, api_list_automations, api_run_automation_now, api_set_automation_paused,
        api_update_automation,
        api_codex_home, api_delete_file,
        api_get_account, api_get_agent_heatmaps, api_get_home_directory, api_get_insight_filter_options,
        api_get_insight_rankings, api_git_branch_info, api_git_checkout_branch, api_git_create_branch,
        api_git_apply_worktree_changes,
        api_git_remove_worktree,
        api_git_diff_stats, api_git_file_diff, api_git_file_diff_meta, api_git_list_branches,
        api_git_create_worktree, api_git_reverse_files, api_git_stage_files,
        api_git_status, api_git_unstage_files, api_git_commit, api_git_push,
        api_list_threads,
        api_prevent_sleep,
        api_login_account, api_model_list, api_model_list_post, api_read_directory, api_read_file,
        api_check_app_installed, api_open_workspace_in,
        api_read_text_file, api_read_text_file_lines,
        api_respond_command_execution_approval,
        api_respond_file_change_approval, api_respond_mcp_elicitation,
        api_respond_permissions_approval, api_respond_user_input,
        api_resume_thread,
        api_rollback_thread, api_fork_thread,
        api_search_files, api_search_files_by_name, api_skills_config_write, api_skills_list, api_start_review,
        api_start_thread, api_watch_directory, api_unwatch_directory,
        api_mcp_server_oauth_login, api_list_mcp_server_status,
        api_skill_groups_read, api_skill_groups_write,
        api_skills_clone_repo, api_skills_delete_central, api_skills_install_marketplace,
        api_skills_link_to_agent, api_skills_list_central, api_skills_list_installed,
        api_skills_list_marketplace, api_skills_uninstall_installed,
        api_skillssh_install, api_skillssh_leaderboard, api_skillssh_search,
        api_terminal_resize, api_terminal_start, api_terminal_stop,
        api_terminal_write, api_turn_interrupt, api_turn_start,
        api_unified_add_mcp_server, api_unified_disable_mcp_server,
        api_unified_enable_mcp_server, api_unified_read_mcp_config,
        api_unified_remove_mcp_server, api_write_file,
        api_get_settings_file, api_save_settings_file, api_pairing_info, health_check, api_model_list_other, api_load_env_keys, api_set_env,
        api_list_provider_presets, api_add_model_provider, api_list_config_providers,
        api_remove_model_provider,
    },
    types::WebServerState,
    websocket::{sse_handler, ws_handler},
};
use crate::auth::require_device_token;

fn resolve_dist_dir() -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();
    let mut seen = HashSet::new();
    let mut add_candidate = |path: PathBuf| {
        if seen.insert(path.clone()) {
            candidates.push(path);
        }
    };

    if let Some(project_root) = Path::new(env!("CARGO_MANIFEST_DIR")).parent() {
        add_candidate(project_root.join("dist"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            add_candidate(exe_dir.join("dist"));
            add_candidate(exe_dir.join("../dist"));
            add_candidate(exe_dir.join("../../dist"));
            add_candidate(exe_dir.join("resources/dist"));
            add_candidate(exe_dir.join("../resources/dist"));
            add_candidate(exe_dir.join("../Resources/dist"));
            add_candidate(exe_dir.join("../../Resources/dist"));
        }
    }

    add_candidate(PathBuf::from("dist"));

    let selected = candidates
        .into_iter()
        .find(|path| path.join("index.html").exists())
        .unwrap_or_else(|| PathBuf::from("dist"));

    selected
}

/// Whether a browser origin may call this API cross-origin.
///
/// Only the locally served UI and Tailscale hostnames qualify. Anything else —
/// an arbitrary site the user happens to visit — must not be able to drive the
/// desktop, which matters especially because the auth layer exempts loopback
/// requests from presenting a token.
fn origin_is_allowed(origin: &str) -> bool {
    // Tauri mobile webviews use their own scheme for the bundled app itself:
    // `tauri://localhost` on iOS, `http://tauri.localhost` on Android.
    if origin == "tauri://localhost" {
        return true;
    }

    let Some(rest) = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
    else {
        return false;
    };

    // Split host from port, keeping bracketed IPv6 literals intact.
    let host = if let Some(end) = rest.strip_prefix('[').and_then(|r| r.find(']')) {
        &rest[1..=end]
    } else {
        rest.split(':').next().unwrap_or(rest)
    };

    matches!(host, "localhost" | "127.0.0.1" | "::1" | "tauri.localhost")
        || host.ends_with(".ts.net")
}

fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin, _| {
            origin.to_str().map(origin_is_allowed).unwrap_or(false)
        }))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
}

pub fn create_router(state: WebServerState) -> Router {
    let dist_dir = resolve_dist_dir();
    let static_site = ServeDir::new(dist_dir.clone())
        .not_found_service(ServeFile::new(dist_dir.join("index.html")));

    let protected = Router::new()
        .route("/ws", get(ws_handler))
        .route("/api/events", get(sse_handler))
        .route("/api/codex/mcp/oauth/login", post(api_mcp_server_oauth_login))
        .route("/api/codex/mcp/status/list", post(api_list_mcp_server_status))
        .route("/api/codex/thread/start", post(api_start_thread))
        .route("/api/codex/start-thread", post(api_start_thread))
        .route("/api/codex/thread/resume", post(api_resume_thread))
        .route("/api/codex/thread/fork", post(api_fork_thread))
        .route("/api/codex/thread/rollback", post(api_rollback_thread))
        .route("/api/codex/thread/list", post(api_list_threads))
        .route("/api/codex/thread/archive", post(api_archive_thread))
        .route("/api/codex/thread/unarchive", post(api_unarchive_thread))
        .route("/api/codex/turn/start", post(api_turn_start))
        .route("/api/codex/turn/interrupt", post(api_turn_interrupt))
        .route(
            "/api/codex/model/list",
            get(api_model_list).post(api_model_list_post),
        )
        .route("/api/codex/model/list-other", get(api_model_list_other))
        .route("/api/codex/provider/presets", get(api_list_provider_presets))
        .route("/api/codex/provider/add", post(api_add_model_provider))
        .route("/api/codex/provider/list", get(api_list_config_providers))
        .route("/api/codex/provider/remove", post(api_remove_model_provider))
        .route("/api/codex/load_env_keys", get(api_load_env_keys))
        .route("/api/codex/set_env", post(api_set_env))
        .route(
            "/api/codex/account/rate-limits",
            get(api_account_rate_limits),
        )
        .route("/api/codex/account/get", post(api_get_account))
        .route("/api/codex/account/login", post(api_login_account))
        .route("/api/codex/skills/list", post(api_skills_list))
        .route(
            "/api/codex/skills/config/write",
            post(api_skills_config_write),
        )
        .route(
            "/api/codex/approval/command-execution",
            post(api_respond_command_execution_approval),
        )
        .route(
            "/api/codex/approval/file-change",
            post(api_respond_file_change_approval),
        )
        .route(
            "/api/codex/approval/user-input",
            post(api_respond_user_input),
        )
        .route(
            "/api/codex/approval/mcp-elicitation",
            post(api_respond_mcp_elicitation),
        )
        .route(
            "/api/codex/approval/permissions",
            post(api_respond_permissions_approval),
        )
        .route("/api/codex/review/start", post(api_start_review))
        .route("/api/filesystem/read-directory", post(api_read_directory))
        .route("/api/openapp/check-app-installed", post(api_check_app_installed))
        .route("/api/openapp/open-workspace-in", post(api_open_workspace_in))
        .route("/api/filesystem/home-directory", get(api_get_home_directory))
        .route("/api/filesystem/canonicalize-path", post(api_canonicalize_path))
        .route("/api/filesystem/search-files", post(api_search_files))
        .route("/api/filesystem/search-files-by-name", post(api_search_files_by_name))
        .route("/api/filesystem/codex-home", get(api_codex_home))
        .route("/api/filesystem/read-file", post(api_read_file))
        .route("/api/filesystem/read-text-file", post(api_read_text_file))
        .route("/api/filesystem/read-text-file-lines", post(api_read_text_file_lines))
        .route("/api/filesystem/write-file", post(api_write_file))
        .route("/api/filesystem/delete-file", post(api_delete_file))
        .route("/api/filesystem/watch", post(api_watch_directory))
        .route("/api/filesystem/unwatch", post(api_unwatch_directory))
        .route("/api/terminal/start", post(api_terminal_start))
        .route("/api/terminal/write", post(api_terminal_write))
        .route("/api/terminal/resize", post(api_terminal_resize))
        .route("/api/terminal/stop", post(api_terminal_stop))
        .route("/api/automation/list", post(api_list_automations))
        .route("/api/automation/runs/list", post(api_list_automation_runs))
        .route("/api/automation/create", post(api_create_automation))
        .route("/api/automation/update", post(api_update_automation))
        .route("/api/automation/set-paused", post(api_set_automation_paused))
        .route("/api/automation/delete", post(api_delete_automation))
        .route("/api/automation/run-now", post(api_run_automation_now))
        .route("/api/skills/list-marketplace", post(api_skills_list_marketplace))
        .route("/api/skills/list-installed", post(api_skills_list_installed))
        .route(
            "/api/skills/install-marketplace",
            post(api_skills_install_marketplace),
        )
        .route(
            "/api/skills/uninstall-installed",
            post(api_skills_uninstall_installed),
        )
        .route("/api/skills/clone-repo", post(api_skills_clone_repo))
        .route("/api/skills/list-central", post(api_skills_list_central))
        .route("/api/skills/link-to-agent", post(api_skills_link_to_agent))
        .route("/api/skills/delete-central", post(api_skills_delete_central))
        .route("/api/skillssh/leaderboard", post(api_skillssh_leaderboard))
        .route("/api/skillssh/search", post(api_skillssh_search))
        .route("/api/skillssh/install", post(api_skillssh_install))
        .route("/api/skills/groups/read", post(api_skill_groups_read))
        .route("/api/skills/groups/write", post(api_skill_groups_write))
        .route("/api/codex/mcp/read", post(api_unified_read_mcp_config))
        .route("/api/codex/mcp/add", post(api_unified_add_mcp_server))
        .route("/api/codex/mcp/remove", post(api_unified_remove_mcp_server))
        .route("/api/codex/mcp/enable", post(api_unified_enable_mcp_server))
        .route("/api/codex/mcp/disable", post(api_unified_disable_mcp_server))
        .route(
            "/api/git/create-worktree",
            post(api_git_create_worktree),
        )
        .route(
            "/api/git/remove-worktree",
            post(api_git_remove_worktree),
        )
        .route(
            "/api/git/apply-worktree-changes",
            post(api_git_apply_worktree_changes),
        )
        .route("/api/git/branch-info", post(api_git_branch_info))
        .route("/api/git/list-branches", post(api_git_list_branches))
        .route("/api/git/create-branch", post(api_git_create_branch))
        .route("/api/git/checkout-branch", post(api_git_checkout_branch))
        .route("/api/git/status", post(api_git_status))
        .route("/api/git/file-diff", post(api_git_file_diff))
        .route("/api/git/file-diff-meta", post(api_git_file_diff_meta))
        .route("/api/git/diff-stats", post(api_git_diff_stats))
        .route("/api/git/stage-files", post(api_git_stage_files))
        .route("/api/git/unstage-files", post(api_git_unstage_files))
        .route("/api/git/reverse-files", post(api_git_reverse_files))
        .route("/api/git/commit", post(api_git_commit))
        .route("/api/git/push", post(api_git_push))
        .route("/api/acp/agents", get(api_acp_list_agents))
        .route("/api/acp/start", post(api_acp_start))
        .route("/api/acp/prompt", post(api_acp_prompt))
        .route("/api/acp/cancel", post(api_acp_cancel))
        .route("/api/acp/authenticate", post(api_acp_authenticate))
        .route("/api/acp/new-session", post(api_acp_new_session))
        .route("/api/acp/load-session", post(api_acp_load_session))
        .route("/api/acp/sessions", post(api_acp_list_sessions))
        .route("/api/acp/session", post(api_acp_get_session))
        .route("/api/acp/delete-session", post(api_acp_delete_session))
        .route("/api/acp/set-mode", post(api_acp_set_mode))
        .route("/api/acp/set-model", post(api_acp_set_model))
        .route("/api/acp/set-config-option", post(api_acp_set_config_option))
        .route("/api/acp/respond-permission", post(api_acp_respond_permission))
        .route("/api/acp/stop", post(api_acp_stop))
        .route("/api/cc/connect", post(api_cc_connect))
        .route("/api/cc/send-message", post(api_cc_send_message))
        .route("/api/cc/disconnect", post(api_cc_disconnect))
        .route("/api/cc/new-session", post(api_cc_new_session))
        .route("/api/cc/interrupt", post(api_cc_interrupt))
        .route("/api/cc/resume-session", post(api_cc_resume_session))
        .route("/api/cc/resolve-permission", post(api_cc_resolve_permission))
        .route("/api/cc/set-permission-mode", post(api_cc_set_permission_mode))
        .route("/api/cc/installed-skills", get(api_cc_get_installed_skills))
        .route("/api/cc/slash-commands", get(api_cc_get_slash_commands))
        .route("/api/cc/settings", get(api_cc_get_settings).post(api_cc_update_settings))
        .route("/api/cc/sessions", get(api_cc_list_sessions))
        .route("/api/cc/session-messages", post(api_cc_get_session_messages))
        .route("/api/cc/delete-session", post(api_cc_delete_session))
        .route("/api/cc/mcp/list", post(api_cc_mcp_list))
        .route("/api/cc/mcp/get", post(api_cc_mcp_get))
        .route("/api/cc/mcp/add", post(api_cc_mcp_add))
        .route("/api/cc/mcp/remove", post(api_cc_mcp_remove))
        .route("/api/cc/mcp/disable", post(api_cc_mcp_disable))
        .route("/api/cc/mcp/enable", post(api_cc_mcp_enable))
        .route("/api/cc/mcp/projects", get(api_cc_list_projects))
        .route("/api/insights/heatmaps", post(api_get_agent_heatmaps))
        .route("/api/insights/rankings", post(api_get_insight_rankings))
        .route("/api/insights/filter-options", post(api_get_insight_filter_options))
        .route("/api/sleep/prevent", post(api_prevent_sleep))
        .route("/api/sleep/allow", post(api_allow_sleep))
        .route("/api/settings", get(api_get_settings_file).post(api_save_settings_file))
        .route("/api/pairing", get(api_pairing_info))
        .route_layer(middleware::from_fn_with_state(
            state.device_token.clone(),
            require_device_token,
        ));

    Router::new()
        // Liveness probe stays open so a client can tell "desktop unreachable"
        // apart from "desktop rejected my token". It exposes no data.
        .route("/health", get(health_check))
        .merge(protected)
        // The SPA bundle carries no user data; the APIs behind it are what
        // require a token.
        .fallback_service(static_site)
        .layer(cors_layer())
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::origin_is_allowed;

    #[test]
    fn local_ui_origins_are_allowed() {
        assert!(origin_is_allowed("http://localhost:7420"));
        assert!(origin_is_allowed("http://127.0.0.1:7420"));
        assert!(origin_is_allowed("http://localhost"));
        assert!(origin_is_allowed("http://[::1]:7420"));
    }

    #[test]
    fn tailscale_origins_are_allowed() {
        assert!(origin_is_allowed("https://codexia-mac.tail1234.ts.net"));
        assert!(origin_is_allowed("http://codexia-mac.tail1234.ts.net:7420"));
    }

    #[test]
    fn arbitrary_sites_are_rejected() {
        assert!(!origin_is_allowed("https://evil.example.com"));
        assert!(!origin_is_allowed("http://evil.example.com:7420"));
        // Suffix matching must not be fooled by a lookalike domain.
        assert!(!origin_is_allowed("https://evil-ts.net"));
        assert!(!origin_is_allowed("https://notts.net.evil.com"));
        assert!(!origin_is_allowed("file://"));
        assert!(!origin_is_allowed("null"));
    }
}
