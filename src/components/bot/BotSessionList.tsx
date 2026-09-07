import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AcpSessionRecord } from '@/services/apiAdapt/acp';
import type { Bot } from '@/services/apiAdapt/bots';
import { listBotSessions } from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { formatThreadAge } from '@/utils/formatThreadAge';
import { useBotSession } from './useBotSession';

/** Persisted conversations belonging only to the open bot. */
export function BotSessionList({ bot }: { bot: Bot }) {
  const { open } = useBotSession();
  const activeSessionId = useAcpStore((s) => s.sessionId);
  const [sessions, setSessions] = useState<AcpSessionRecord[]>([]);
  const [opening, setOpening] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSessions(await listBotSessions(bot.id));
    } catch (error) {
      console.error('bots: failed to list sessions', error);
    }
  }, [bot.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const select = async (session: AcpSessionRecord) => {
    if (session.sessionId === activeSessionId) return;
    setOpening(session.sessionId);
    try {
      await open(bot, session);
    } finally {
      setOpening(null);
      refresh();
    }
  };

  // Sessions without a title were created but never used (e.g. a session
  // opened on startup that the user never sent a message to). Exclude them so
  // they never appear as blank "New session" rows in the list.
  const titled = sessions.filter((s) => s.title !== null);
  if (titled.length < 2) return null;

  return (
    <div className="flex flex-col shrink-0 gap-1 overflow-y-auto border-b px-3 py-1.5 max-h-40">
      {titled.map((session) => (
        <button
          type="button"
          key={session.sessionId}
          disabled={opening !== null}
          onClick={() => {
            select(session);
          }}
          className={`flex min-w-0 w-full shrink-0 items-baseline gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors disabled:opacity-60 ${
            session.sessionId === activeSessionId
              ? 'bg-accent font-medium'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          }`}
          title={session.title ?? 'New session'}
        >
          {opening === session.sessionId && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
          <span className="min-w-0 flex-1 truncate">{session.title ?? 'New session'}</span>
          <span className="shrink-0 text-[10px] opacity-70">
            {formatThreadAge(Math.floor(new Date(session.updatedAt).getTime() / 1000))}
          </span>
        </button>
      ))}
    </div>
  );
}
