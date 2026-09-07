import { Plus, SquarePen } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { type Bot, createBot, listBots } from '@/services/apiAdapt/bots';
import { useLayoutStore } from '@/stores';
import { useBotUiStore } from '@/stores/useBotUiStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { BotAvatar } from './BotAvatar';
import { BotSessionList } from './BotSessionList';
import { BotSettingsDialog } from './BotSettingsDialog';
import { defaultLook, newBotId } from './botDefaults';
import { useBotSession } from './useBotSession';

/** "3m", "4h", "2d" — enough to place a conversation without a full date. */
function since(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * The bot list: one flat, most-recent-first column, the way a messages app
 * shows conversations. Reading it never starts an agent — a bot's process only
 * wakes when you open it.
 */
export function SideBarBotPane() {
  const { t } = useTranslation('sidebar');
  const { bots, setBots, upsertBot, selectedBotId, connectionByBot } = useBotUiStore();
  const setView = useLayoutStore((s) => s.setView);
  const cwd = useWorkspaceStore((s) => s.cwd);
  const { open, openBlank, startNew } = useBotSession();
  const [newBot, setNewBot] = useState<Bot | null>(null);

  useEffect(() => {
    listBots()
      .then(setBots)
      .catch((e) => console.error('bots: failed to list', e));
  }, [setBots]);

  const create = useCallback(async () => {
    const look = defaultLook(bots.length);
    try {
      const bot = await createBot({
        id: newBotId(),
        name: `Bot ${bots.length + 1}`,
        avatar: look.avatar,
        color: look.color,
        cwd: cwd ?? '',
      });
      upsertBot(bot);
      openBlank(bot);
      setView('bot');
      setNewBot(bot);
    } catch (e) {
      toast({ title: 'Could not create bot', description: String(e), variant: 'destructive' });
    }
  }, [bots.length, cwd, openBlank, setView, upsertBot]);

  const select = useCallback(
    (bot: Bot) => {
      setView('bot');
      void open(bot);
    },
    [open, setView]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-1 pb-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={create}>
          <Plus className="h-4 w-4" />
          {t('newBot')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {bots.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No bots yet. A bot is a named agent you can keep messaging.
          </p>
        )}

        {bots.map((bot) => (
          <div key={bot.id}>
            <div
              className={`group flex w-full items-center gap-2 px-2 py-2 hover:bg-accent/50 ${
                selectedBotId === bot.id ? 'bg-accent' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => select(bot)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <BotAvatar bot={bot} running={Boolean(connectionByBot[bot.id])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{bot.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {bot.title || bot.model || bot.cwd || 'keke'}
                  </span>
                </span>
                {bot.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {bot.unreadCount}
                  </span>
                )}
              </button>
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                <span className="text-[10px] text-muted-foreground group-hover:hidden">
                  {since(bot.updatedAt)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="New session"
                  className="hidden group-hover:inline-flex"
                  onClick={() => {
                    setView('bot');
                    void startNew(bot);
                  }}
                >
                  <SquarePen />
                </Button>
              </span>
            </div>

            {selectedBotId === bot.id && <BotSessionList bot={bot} />}
          </div>
        ))}
      </div>

      {newBot && (
        <BotSettingsDialog
          bot={newBot}
          open={Boolean(newBot)}
          onOpenChange={(open) => {
            if (!open) setNewBot(null);
          }}
        />
      )}
    </div>
  );
}
