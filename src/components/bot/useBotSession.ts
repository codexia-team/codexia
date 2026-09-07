import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { acpGetSession, acpSetConfigOption, acpStart } from '@/services/apiAdapt/acp';
import type { Bot } from '@/services/apiAdapt/bots';
import { listBotSessions } from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';
import { applyAcpUpdate } from '../acp/applyUpdate';
import { loadAcpAgents } from '../acp/useAcpAgents';
import { botAgentDef, trustFor } from './botAgentDef';

/**
 * Opening a bot's conversation.
 *
 * A bot is its own long-lived keke process: the connection is kept in
 * `useBotUiStore` so coming back to a bot costs nothing, and only the very
 * first message pays for a spawn. Nothing here runs while the sidebar merely
 * lists bots — that read is deliberately cold.
 */
export function useBotSession() {
  /** Apply the bot's own settings to a session keke has just opened. */
  const applySettings = useCallback(async (bot: Bot, connectionId: string, sessionId: string) => {
    const trust = trustFor(bot);
    const options: Array<[string, string]> = [['approval_policy', trust.approvalPolicy]];
    if (bot.model) options.push(['model', bot.model]);
    if (bot.reasoningEffort) options.push(['reasoning_effort', bot.reasoningEffort]);

    for (const [id, value] of options) {
      // An agent that does not offer one of these says so per option; that is
      // not a reason to abandon the rest of the bot's settings.
      try {
        await acpSetConfigOption(connectionId, sessionId, id, value);
      } catch (e) {
        console.warn(`bot: ${bot.name} could not set ${id}`, e);
      }
    }
  }, []);

  /**
   * Show a bot's conversation, starting its process if it has none. Returns the
   * live ids, or null when the bot could not be opened.
   */
  const open = useCallback(
    async (bot: Bot) => {
      const ui = useBotUiStore.getState();
      const store = useAcpStore.getState();

      ui.setSelectedBotId(bot.id);
      store.setAgentId(bot.agentId);

      const existing = ui.connectionByBot[bot.id];
      const existingSession = ui.sessionByBot[bot.id];
      if (existing && existingSession) {
        // The process is still ours; only the pane has to catch up.
        store.setConnection({
          connectionId: existing,
          sessionId: existingSession,
          agentTitle: bot.name,
          authMethods: [],
          canLoadSession: store.canLoadSession,
        });
        store.setEntries([]);
        for (const update of await acpGetSession(existingSession)) {
          applyAcpUpdate(update as Record<string, any>);
        }
        return { connectionId: existing, sessionId: existingSession };
      }

      // Neither a local `keke` nor `npx` resolved: there is nothing to spawn.
      // The composer shows an install prompt for this instead of a toast.
      // Awaited fresh rather than read off `useAcpAgents`' hook state, which
      // can still be the pre-fetch empty array on a component's first render.
      const keke = (await loadAcpAgents()).find((a) => a.id === 'keke');
      console.log('bot: opening', bot.name, 'with keke', keke);
      if (!keke || !keke.local) {
        store.setEntries([]);
        return null;
      }

      store.setConnecting(true);
      store.setEntries([]);
      try {
        const res = await acpStart(bot.agentId, bot.cwd, botAgentDef(bot, keke), bot.id);
        store.setConnection({
          connectionId: res.connectionId,
          sessionId: res.sessionId,
          agentTitle: bot.name,
          authMethods: res.initialize.authMethods ?? [],
          canLoadSession: res.initialize.agentCapabilities?.loadSession === true,
        });
        store.applySession(res.session);
        ui.setBotConnection(bot.id, res.connectionId);

        if (res.sessionError || !res.sessionId) {
          store.addEntry({
            id: `start-${Date.now()}`,
            role: 'error',
            text: res.sessionError ?? 'keke opened no session.',
          });
          return null;
        }
        ui.setBotSession(bot.id, res.sessionId);
        ui.setKekeSpawnFailed(false);
        await applySettings(bot, res.connectionId, res.sessionId);

        // A bot that has talked before gets its last conversation back, so the
        // chat reads as one continuous thread rather than restarting each time
        // the app does. keke's own session is new; the transcript is history.
        const stored = await listBotSessions(bot.id).catch(() => []);
        const previous = stored.find((record) => record.sessionId !== res.sessionId);
        if (previous) {
          for (const update of await acpGetSession(previous.sessionId)) {
            applyAcpUpdate(update as Record<string, any>);
          }
        }

        return { connectionId: res.connectionId, sessionId: res.sessionId };
      } catch (e) {
        // `available` said keke would run — a packaged app's PATH not
        // matching the shell's is the usual reason it didn't anyway. Once
        // that happens, show the install prompt instead of retrying and
        // toasting on every message.
        if (/failed to spawn|no such file|not found|enoent/i.test(String(e))) {
          ui.setKekeSpawnFailed(true);
        } else {
          toast({
            title: `Could not start ${bot.name}`,
            description: String(e),
            variant: 'destructive',
          });
        }
        return null;
      } finally {
        store.setConnecting(false);
      }
    },
    [applySettings]
  );

  return { open, applySettings };
}
