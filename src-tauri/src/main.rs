// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // `fix()` only restores PATH. A GUI-launched process on macOS/Linux gets
    // none of the shell's other env vars either — agents that read API keys
    // straight from the environment (e.g. keke reading NVIDIA_API_KEY) see
    // them as unset even though they're exported in the user's shell rc.
    let _ = fix_path_env::fix_all_vars();
    codexia_lib::run();
}
