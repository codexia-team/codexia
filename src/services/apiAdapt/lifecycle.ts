import { invokeTauri, isDesktopTauri } from './shared';

/**
 * Boots the codex app-server process the desktop app owns.
 *
 * Native-only on purpose: the web build's server starts codex itself, so there
 * is nothing for a browser client to kick off here.
 */
export async function initializeCodexAsync() {
  if (isDesktopTauri()) {
    return await invokeTauri<void>('initialize_codex_async');
  }
}
