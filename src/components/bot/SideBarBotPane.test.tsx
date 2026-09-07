import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';

const createBot = vi.fn();

vi.mock('@/services/apiAdapt/bots', () => ({
  listBots: vi.fn().mockResolvedValue([]),
  createBot: (...args: unknown[]) => createBot(...args),
  listBotSessions: vi.fn().mockResolvedValue([]),
  updateBot: vi.fn(),
  deleteBot: vi.fn(),
  parseBotList: () => [],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./BotSettingsDialog', () => ({ BotSettingsDialog: () => null }));

import { SideBarBotPane } from './SideBarBotPane';

beforeEach(() => {
  vi.clearAllMocks();
  useAcpStore.getState().reset();
  useBotUiStore.setState({ bots: [], selectedBotId: null, connectionByBot: {}, sessionByBot: {} });
});

describe('SideBarBotPane', () => {
  it('clears the pane when a bot is created, so the previous bot does not appear to be it', async () => {
    createBot.mockImplementation(async (bot: Record<string, unknown>) => ({
      ...bot,
      title: null,
      agentId: 'keke',
      provider: null,
      model: null,
      reasoningEffort: null,
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
      updatedAt: new Date().toISOString(),
    }));
    // What the previously open bot left in the shared ACP store.
    useAcpStore.getState().setEntries([{ id: 'a', role: 'agent', text: 'bot1 was talking' }]);

    render(<SideBarBotPane />);
    fireEvent.click(screen.getByText('newBot'));

    await waitFor(() => expect(useAcpStore.getState().entries).toEqual([]));
    expect(useBotUiStore.getState().selectedBotId).toBeTruthy();
  });
});
