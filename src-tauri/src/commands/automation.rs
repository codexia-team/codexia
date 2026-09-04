use codexia_automation::AutomationHandle;

/// `None` when the scheduler failed to start, so callers report that instead of
/// failing to resolve their state.
///
/// The automation endpoints themselves live in `codexia_web` — the desktop app
/// only owns the handle and hands it to the loopback server.
pub type AutomationState = Option<AutomationHandle>;
