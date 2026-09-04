// Core modules — the command surface exists only on desktop, where the agent
// backend actually runs. Mobile talks to a paired desktop over HTTP instead.
#[cfg(desktop)]
mod commands;
#[cfg(desktop)]
pub mod dictation;
#[cfg(desktop)]
mod event_sink;
#[cfg(all(any(windows, target_os = "linux")))]
mod window;
#[cfg(all(target_os = "macos"))]
mod menu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Mobile: a webview shell. Every backend call is HTTP to the paired
    // desktop, so there are no commands and no managed agent state here.
    #[cfg(mobile)]
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_barcode_scanner::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        );

    // Desktop: full app with all plugins, commands, and setup.
    #[cfg(desktop)]
    let builder = {
        use cc::CCState;
        use dictation::DictationState;
        use codexia_shared::terminal::TerminalState;
        use codexia_shared::sleep::SleepState;
        use codexia_shared::state::WatchState;
        use codexia_codex as codex;
        use codexia_cc as cc;
        use std::sync::Arc;
        use std::time::Instant;
        use tauri::Manager;

        let builder = tauri::Builder::default()
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_deep_link::init())
            .plugin(
                tauri_plugin_log::Builder::new()
                    .level(log::LevelFilter::Info)
                    .build(),
            )
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_screenshots::init())
            .plugin(tauri_plugin_updater::Builder::new().build());

        #[cfg(any(windows, target_os = "linux"))]
        let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            crate::window::show_window(app, argv);
        }));

        #[cfg(target_os = "macos")]
        let builder = builder
            .menu(|app| {
                crate::menu::build_menu(app)
            })
            .on_menu_event(|app, event| {
                crate::menu::on_menu_event(app, &event)
            });

        builder
            .manage(WatchState::new())
            .manage(TerminalState::default())
            .manage(SleepState::default())
            .manage(DictationState::default())
            .invoke_handler(tauri::generate_handler![
                commands::codex::list_other_models,
                commands::codex::list_provider_presets,
                commands::codex::add_model_provider,
                commands::codex::list_config_providers,
                commands::codex::remove_model_provider,
                commands::codex::load_env_keys,
                commands::codex::start_thread,
                commands::codex::resume_thread,
                commands::codex::fork_thread,
                commands::codex::rollback_thread,
                commands::codex::list_threads,
                commands::codex::archive_thread,
                commands::codex::unarchive_thread,
                commands::codex::delete_thread,
                commands::codex::rename_thread,
                commands::codex::turn_start,
                commands::codex::turn_steer,
                commands::codex::turn_interrupt,
                commands::codex::model_list,
                commands::codex::account_rate_limits,
                commands::codex::get_account,
                commands::codex::login_account,
                commands::codex::save_account_snapshot,
                commands::codex::list_account_snapshots,
                commands::codex::remove_account_snapshot,
                commands::codex::switch_account_snapshot,
                commands::codex::skills_list,
                commands::codex::skills_config_write,
                commands::codex::mcp_server_oauth_login,
                commands::codex::list_mcp_server_status,
                commands::codex::thread_compact_start,
                commands::codex::thread_memory_mode_set,
                commands::codex::memory_reset,
                commands::codex::hooks_list,
                commands::codex::external_agent_config_detect,
                commands::codex::external_agent_config_import,
                commands::codex::external_agent_config_import_record_history,
                commands::codex::external_agent_config_import_read_histories,
                commands::codex::plugin_list,
                commands::codex::plugin_installed,
                commands::codex::plugin_read,
                commands::codex::plugin_install,
                commands::codex::plugin_uninstall,
                commands::codex::start_review,
                commands::codex::thread_goal_set,
                commands::codex::thread_goal_get,
                commands::codex::thread_goal_clear,
                commands::codex::respond_to_command_execution_approval,
                commands::codex::respond_to_file_change_approval,
                commands::codex::respond_to_request_user_input,
                commands::codex::respond_to_mcp_elicitation,
                commands::codex::respond_to_permissions_approval,
                commands::codex::initialize_codex_async,
                commands::openapp::check_app_installed,
                commands::openapp::open_workspace_in,
                commands::sleep::prevent_sleep,
                commands::sleep::allow_sleep,
                commands::acp::acp_list_agents,
                commands::acp::acp_start,
                commands::acp::acp_prompt,
                commands::acp::acp_cancel,
                commands::acp::acp_authenticate,
                commands::acp::acp_new_session,
                commands::acp::acp_load_session,
                commands::acp::acp_list_sessions,
                commands::acp::acp_get_session,
                commands::acp::acp_delete_session,
                commands::acp::acp_set_mode,
                commands::acp::acp_set_model,
                commands::acp::acp_set_config_option,
                commands::acp::acp_respond_permission,
                commands::acp::acp_stop,
                commands::cc::cc_connect,
                commands::cc::cc_new_session,
                commands::cc::cc_send_message,
                commands::cc::cc_disconnect,
                commands::cc::cc_interrupt,
                commands::cc::cc_resume_session,
                commands::cc::cc_list_sessions,
                commands::cc::cc_delete_session,
                commands::cc::cc_get_session_messages,
                commands::cc::cc_get_installed_skills,
                commands::cc::cc_get_slash_commands,
                commands::cc::cc_get_settings,
                commands::cc::cc_update_settings,
                commands::cc::cc_resolve_permission,
                commands::cc::cc_set_permission_mode,
                commands::cc::cc_mcp_list,
                commands::cc::cc_mcp_get,
                commands::cc::cc_mcp_add,
                commands::cc::cc_mcp_remove,
                commands::cc::cc_list_projects,
                commands::cc::cc_mcp_disable,
                commands::cc::cc_mcp_enable,
                commands::mcp::unified_add_mcp_server,
                commands::mcp::unified_remove_mcp_server,
                commands::mcp::unified_enable_mcp_server,
                commands::mcp::unified_disable_mcp_server,
                commands::mcp::unified_read_mcp_config,
                commands::skillssh::fetch_market_leaderboard,
                commands::skillssh::search_market_skills,
                commands::skillssh::install_from_market,
                commands::skills::clone_skills_repo,
                commands::skills::list_marketplace_skills,
                commands::skills::list_installed_skills,
                commands::skills::list_central_skills,
                commands::skills::install_marketplace_skill,
                commands::skills::uninstall_installed_skill,
                commands::skills::link_skill_to_agent,
                commands::skills::delete_central_skill,
                commands::skills::read_skill_groups,
                commands::skills::write_skill_groups,
                commands::automation::list_automations,
                commands::automation::list_automation_runs,
                commands::automation::create_automation,
                commands::automation::update_automation,
                commands::automation::set_automation_paused,
                commands::automation::delete_automation,
                commands::automation::run_automation_now,
                commands::git::git_branch_info,
                commands::git::git_list_branches,
                commands::git::git_create_branch,
                commands::git::git_checkout_branch,
                commands::git::git_status,
                commands::git::git_file_diff,
                commands::git::git_file_diff_meta,
                commands::git::git_diff_stats,
                commands::git::git_stage_files,
                commands::git::git_unstage_files,
                commands::git::git_reverse_files,
                commands::git::git_create_worktree,
                commands::git::git_remove_worktree,
                commands::git::git_apply_worktree_changes,
                commands::git::git_has_worktree_changes,
                commands::git::git_commit,
                commands::git::git_push,
                commands::terminal::terminal_start,
                commands::terminal::terminal_write,
                commands::terminal::terminal_resize,
                commands::terminal::terminal_stop,
                commands::dictation::dictation_model_status,
                commands::dictation::dictation_download_model,
                commands::dictation::dictation_cancel_download,
                commands::dictation::dictation_remove_model,
                commands::dictation::dictation_start,
                commands::dictation::dictation_request_permission,
                commands::dictation::dictation_stop,
                commands::dictation::dictation_cancel,
                commands::insights::get_agent_heatmaps,
                commands::insights::get_insight_filter_options,
                commands::insights::get_insight_rankings,
                quit_app,
                commands::codex::codex_home,
                commands::env::get_env,
                commands::env::set_env,
                commands::updater::is_homebrew_install,
                commands::remote::remote_status,
                commands::remote::remote_start,
                commands::remote::remote_stop,
                commands::remote::remote_rotate_token,
            ])
            .setup(|app| {
                let app_handle = app.handle().clone();

                // Fan out to the webview and to the remote server's channel, so
                // remote access can be toggled later without rebuilding the
                // codex client or CCState around a different sink.
                let (remote_event_tx, _) = tokio::sync::broadcast::channel(4096);
                let event_sink: Arc<dyn codexia_shared::event_sink::EventSink> =
                    Arc::new(event_sink::FanOutEventSink::new(vec![
                        Arc::new(event_sink::TauriEventSink::new(app_handle)),
                        Arc::new(event_sink::BroadcastEventSink::new(remote_event_tx.clone())),
                    ]));

                app.manage(commands::remote::RemoteState::new(remote_event_tx));
                app.manage(CCState::new(Arc::clone(&event_sink)));
                app.manage(codexia_acp::AcpState::new(Arc::clone(&event_sink)));

                let codex_init_started_at = Instant::now();
                let init_result = tauri::async_runtime::block_on(async {
                    let connect_started_at = Instant::now();
                    let codex_client = codex::connect_codex(Arc::clone(&event_sink)).await?;
                    log::info!(
                        "codex startup timing: connect_codex finished in {:?}",
                        connect_started_at.elapsed()
                    );
                    Ok::<_, String>(codex_client)
                });

                let codex_runner_client = init_result.as_ref().ok().cloned();

                match init_result {
                    Ok(codex_client) => {
                        log::info!(
                            "codex startup timing: total connect during setup took {:?}",
                            codex_init_started_at.elapsed()
                        );
                        app.handle().manage(codex::AppState { codex: codex_client });
                        app.handle().manage(codex::CodexInitializationState::new(
                            Arc::clone(&event_sink),
                        ));
                        // Providers are written to config.toml only when the user
                        // adds one explicitly (see `add_model_provider`).
                    }
                    Err(err) => {
                        log::warn!(
                            "codex app-server init failed after {:?}, app will continue without codex backend: {}",
                            codex_init_started_at.elapsed(),
                            err,
                        );
                    }
                }

                // Start the scheduler here rather than on the first frontend call, so
                // cron tasks fire even if the UI is never opened.
                let cc_runner = Arc::new(cc::CcAgentRunner::new(
                    app.state::<CCState>().inner().clone(),
                ));
                let codex_runner = Arc::new(codex::CodexAgentRunner::new(codex_runner_client));
                let automation = match tauri::async_runtime::block_on(
                    codexia_automation::AutomationHandle::start(
                        vec![codex_runner, cc_runner],
                        Arc::clone(&event_sink),
                    ),
                ) {
                    Ok(handle) => Some(handle),
                    Err(err) => {
                        log::error!("failed to start automation runtime: {}", err);
                        None
                    }
                };
                app.manage::<commands::automation::AutomationState>(automation);

                // Runs left as 'running' belong to a previous process and can never finish.
                if let Err(err) = codexia_db::automation_runs::fail_orphaned_runs() {
                    log::warn!("failed to clean up orphaned automation runs: {}", err);
                }

                cc::scan::start_session_scanner();

                // Always serve the loopback API, independent of the remote
                // toggle: the frontend calls it for endpoints that have been
                // migrated off `#[tauri::command]` onto the same HTTP handlers
                // the web build uses, so there is one implementation instead
                // of two. Reuses the remote channel's sender so events flow to
                // this server's `/ws` and `/api/events` too.
                {
                    let remote = app.state::<commands::remote::RemoteState>();
                    commands::local_server::start_local_server(
                        app.handle(),
                        remote.event_tx.clone(),
                    );
                }

                // Restore remote access if the user left it on, so a paired
                // phone can reach this machine after a restart without someone
                // walking over to flip the switch. Runs after the codex, cc,
                // acp and automation states are managed — the server borrows
                // all of them.
                if commands::remote::remote_enabled() {
                    let remote = app.state::<commands::remote::RemoteState>();
                    let cc_state = app.state::<CCState>();
                    match commands::remote::start_server(
                        app.handle(),
                        remote.inner(),
                        cc_state.inner(),
                    ) {
                        Ok(status) => log::info!(
                            "[remote] restored on {}:{}",
                            status.host.unwrap_or_default(),
                            status.port
                        ),
                        Err(err) => log::warn!("[remote] could not restore: {err}"),
                    }
                }

                tauri::async_runtime::spawn(async {
                    tokio::task::spawn_blocking(codexia_git::scan_all_orphan_worktrees)
                        .await
                        .ok();
                });

                if let Some(main_window) = app.get_webview_window("main") {
                    let app_handle = app.handle().clone();
                    main_window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            if let Some(w) = app_handle.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        }
                    });
                }

                #[cfg(any(windows, target_os = "linux"))]
                {
                    use tauri_plugin_deep_link::DeepLinkExt;
                    app.deep_link().register_all()?;
                }

                Ok(())
            })
    };

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // macOS: clicking the Dock icon when the main window is hidden should show it.
            #[cfg(target_os = "macos")]
            {
            use tauri::Manager;
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = &_event {
                if !has_visible_windows {
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            }
        });
}

#[cfg(desktop)]
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
