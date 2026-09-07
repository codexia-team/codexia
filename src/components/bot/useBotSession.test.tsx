import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bot } from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';

const acpStart = vi.fn();
const acpGetSession = vi.fn();
const listBotSessions = vi.fn();

vi.mock('@/services/apiAdapt/acp', () => ({
  acpStart: (...args: unknown[]) => acpStart(...args),
  acpGetSession: (...args: unknown[]) => acpGetSession(...args),
  acpSetConfigOption: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/apiAdapt/bots', () => ({
  listBotSessions: (...args: unknown[]) => listBotSessions(...args),
}));

vi.mock('../acp/useAcpAgents', () => ({
  loadAcpAgents: async () => [
    { id: 'keke', name: 'keke', command: 'keke', args: [], env: {}, available: true, local: true },
  ],
}));

vi.mock('@/stores/useBotOptionsStore', () => ({ captureBotOptions: vi.fn() }));
vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }));

import { useBotSession } from './useBotSession';

function bot(id: string): Bot {
  return {
    id,
    name: id,
    title: null,
    avatar: '',
    color: '',
    agentId: 'keke',
    provider: null,
    model: null,
    reasoningEffort: null,
    cwd: '/tmp',
    systemPrompt: null,
    trustLevel: 'ask',
    approvedTools: '[]',
    mcpServers: '[]',
    pinned: false,
    archived: false,
    notificationsEnabled: true,
    unreadCount: 0,
    lastViewedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

/** A stored transcript entry, as the agent streams it. */
const said = (text: string) => ({
  sessionUpdate: 'agent_message_chunk',
  content: { type: 'text', text },
});

const sessionRecord = (sessionId: string, botId: string) => ({
  sessionId,
  agentId: 'keke',
  agentTitle: 'keke',
  cwd: '/tmp',
  botId,
  title: null,
  createdAt: '',
  updatedAt: '',
});

/** The hook only wraps callbacks, so one render per test is enough. */
const openBot = () => renderHook(() => useBotSession()).result.current.open;
const hook = () => renderHook(() => useBotSession()).result.current;

const texts = () =>
  useAcpStore
    .getState()
    .entries.filter((e) => e.role !== 'tool')
    .map((e) => e.text);

beforeEach(() => {
  vi.clearAllMocks();
  useAcpStore.getState().reset();
  useBotUiStore.setState({
    bots: [],
    selectedBotId: null,
    connectionByBot: {},
    sessionByBot: {},
    runningByBot: {},
    kekeSpawnFailed: false,
  });
});

describe('useBotSession.open', () => {
  it('replays the last transcript that has messages, not the empty session a restart left behind', async () => {
    // What a restarted app sees: this run's fresh session, the empty session
    // the previous run opened, and before that the real conversation.
    acpStart.mockResolvedValue({
      connectionId: 'c-new',
      sessionId: 's-new',
      initialize: {},
      session: { sessionId: 's-new' },
      sessionError: null,
    });
    listBotSessions.mockResolvedValue([
      sessionRecord('s-new', 'bot1'),
      sessionRecord('s-empty', 'bot1'),
      sessionRecord('s-old', 'bot1'),
    ]);
    acpGetSession.mockImplementation(async (id: string) =>
      id === 's-old' ? [said('from before the restart')] : []
    );

    const open = openBot();
    await open(bot('bot1'));

    expect(texts()).toEqual(['from before the restart']);
  });

  it('does not pour a slow bot\'s history into the bot the user switched to', async () => {
    acpStart.mockImplementation(async (_agentId, _cwd, _def, botId: string) => ({
      connectionId: `c-${botId}`,
      sessionId: `s-${botId}`,
      initialize: {},
      session: { sessionId: `s-${botId}` },
      sessionError: null,
    }));
    listBotSessions.mockImplementation(async (botId: string) => [
      sessionRecord(`s-${botId}`, botId),
      sessionRecord(`old-${botId}`, botId),
    ]);

    // bot1's transcript resolves only after bot2 has been opened.
    let releaseBot1: () => void = () => {};
    const bot1Loaded = new Promise<void>((resolve) => {
      releaseBot1 = resolve;
    });
    acpGetSession.mockImplementation(async (id: string) => {
      if (id === 'old-bot1') {
        await bot1Loaded;
        return [said('bot1 history')];
      }
      if (id === 'old-bot2') return [said('bot2 history')];
      return [];
    });

    const open = openBot();
    const first = open(bot('bot1'));
    await open(bot('bot2'));
    releaseBot1();
    await first;

    expect(useBotUiStore.getState().selectedBotId).toBe('bot2');
    expect(texts()).toEqual(['bot2 history']);
    // bot1's process is still remembered, it just did not render.
    expect(useBotUiStore.getState().connectionByBot.bot1).toBe('c-bot1');
  });

  it('restores a bot that is already connected without spawning again', async () => {
    useBotUiStore.setState({
      connectionByBot: { bot1: 'c-1' },
      sessionByBot: { bot1: 's-1' },
    });
    acpGetSession.mockImplementation(async (id: string) =>
      id === 's-1' ? [said('still here')] : []
    );

    const open = openBot();
    await open(bot('bot1'));

    expect(acpStart).not.toHaveBeenCalled();
    expect(texts()).toEqual(['still here']);
  });
  it('keeps history and this run\'s messages when switching away and back', async () => {
    acpStart.mockImplementation(async (_agentId, _cwd, _def, botId: string) => ({
      connectionId: `c-${botId}`,
      sessionId: `s-${botId}`,
      initialize: {},
      session: { sessionId: `s-${botId}` },
      sessionError: null,
    }));
    listBotSessions.mockImplementation(async (botId: string) => [
      sessionRecord(`s-${botId}`, botId),
      sessionRecord(`old-${botId}`, botId),
    ]);
    const live: Record<string, unknown[]> = {
      's-bot1': [],
      's-bot2': [],
      'old-bot1': [said('before the restart')],
      'old-bot2': [],
    };
    acpGetSession.mockImplementation(async (id: string) => live[id] ?? []);

    const open = openBot();
    await open(bot('bot1'));
    // A turn taken in this run lands in the fresh session.
    live['s-bot1'] = [said('after the restart')];

    await open(bot('bot2'));
    await open(bot('bot1'));

    expect(texts()).toEqual(['before the restart', 'after the restart']);
  });

  it('shows an empty pane for a bot that was just created', async () => {
    acpStart.mockResolvedValue({
      connectionId: 'c-1',
      sessionId: 's-1',
      initialize: {},
      session: { sessionId: 's-1' },
      sessionError: null,
    });
    listBotSessions.mockResolvedValue([sessionRecord('old-bot1', 'bot1')]);
    acpGetSession.mockImplementation(async (id: string) =>
      id === 'old-bot1' ? [said('bot1 was talking')] : []
    );

    const { open, openBlank } = hook();
    await open(bot('bot1'));
    expect(texts()).toEqual(['bot1 was talking']);

    // Creating a bot does not start it, so nothing clears the pane but this.
    openBlank(bot('bot2'));

    expect(texts()).toEqual([]);
    expect(useBotUiStore.getState().selectedBotId).toBe('bot2');
  });
});