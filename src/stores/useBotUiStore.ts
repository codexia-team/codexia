import { create } from 'zustand';
import type { Bot } from '@/services/apiAdapt/bots';

/**
 * Client state for the Bot tab. The bots themselves live in the database, so
 * nothing here is persisted: this is the cache the sidebar renders from, plus
 * the live connections that must survive switching between bots.
 */
interface BotUiStore {
  bots: Bot[];
  setBots: (bots: Bot[]) => void;
  /** Replace one bot in place, after an update round-trip. */
  upsertBot: (bot: Bot) => void;
  removeBot: (id: string) => void;
  selectedBotId: string | null;
  setSelectedBotId: (id: string | null) => void;
  /**
   * The keke process each bot is talking to. Kept so switching back to a bot
   * reuses its process instead of paying for a spawn and a fresh session.
   */
  connectionByBot: Record<string, string>;
  setBotConnection: (botId: string, connectionId: string) => void;
  clearBotConnection: (botId: string) => void;
  /** The ACP session currently open for each bot, so a return restores it. */
  sessionByBot: Record<string, string>;
  setBotSession: (botId: string, sessionId: string) => void;
  /**
   * `keke` (or its `npx` fallback) resolved on PATH but actually spawning it
   * failed anyway — e.g. a packaged app's PATH doesn't match the shell's.
   * Once this happens the composer treats keke as unusable, the same as the
   * preset never resolving, rather than retrying and toasting on every send.
   */
  kekeSpawnFailed: boolean;
  setKekeSpawnFailed: (failed: boolean) => void;
}

export const useBotUiStore = create<BotUiStore>((set) => ({
  bots: [],
  setBots: (bots) => set({ bots }),
  upsertBot: (bot) =>
    set((state) => ({
      bots: state.bots.some((b) => b.id === bot.id)
        ? state.bots.map((b) => (b.id === bot.id ? bot : b))
        : [...state.bots, bot],
    })),
  removeBot: (id) =>
    set((state) => {
      const { [id]: _connection, ...connectionByBot } = state.connectionByBot;
      const { [id]: _session, ...sessionByBot } = state.sessionByBot;
      return {
        bots: state.bots.filter((bot) => bot.id !== id),
        connectionByBot,
        sessionByBot,
        selectedBotId: state.selectedBotId === id ? null : state.selectedBotId,
      };
    }),
  selectedBotId: null,
  setSelectedBotId: (selectedBotId) => set({ selectedBotId }),
  connectionByBot: {},
  setBotConnection: (botId, connectionId) =>
    set((state) => ({ connectionByBot: { ...state.connectionByBot, [botId]: connectionId } })),
  clearBotConnection: (botId) =>
    set((state) => {
      const { [botId]: _removed, ...connectionByBot } = state.connectionByBot;
      return { connectionByBot };
    }),
  sessionByBot: {},
  setBotSession: (botId, sessionId) =>
    set((state) => ({ sessionByBot: { ...state.sessionByBot, [botId]: sessionId } })),
  kekeSpawnFailed: false,
  setKekeSpawnFailed: (kekeSpawnFailed) => set({ kekeSpawnFailed }),
}));
