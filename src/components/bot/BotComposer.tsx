import { ArrowUp, Square } from 'lucide-react';
import { useState } from 'react';
import { useAcpAgents } from '@/components/acp/useAcpAgents';
import { Button } from '@/components/ui/button';
import { acpCancel, acpPrompt } from '@/services/apiAdapt/acp';
import type { Bot } from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';
import { BotKekeInstall } from './BotKekeInstall';
import { useBotSession } from './useBotSession';

export function BotComposer({ bot }: { bot: Bot }) {
  const { connectionId, connecting, setRunning, addEntry } = useAcpStore();
  const connectionByBot = useBotUiStore((s) => s.connectionByBot);
  const sessionByBot = useBotUiStore((s) => s.sessionByBot);
  const kekeSpawnFailed = useBotUiStore((s) => s.kekeSpawnFailed);
  const running = useBotUiStore((s) => Boolean(s.runningByBot[bot.id]));
  const setBotRunning = useBotUiStore((s) => s.setBotRunning);
  const { open } = useBotSession();
  const [text, setText] = useState('');

  // Scoped to this bot: the ACP store can still hold another agent's live
  // connection from the chat pane, which must not read as this bot's.
  const botConnection = connectionByBot[bot.id];
  const botSession = sessionByBot[bot.id];
  const hasSession = Boolean(botConnection && botSession);

  // `null` while the agent list is still resolving — only an actually resolved
  // list saying keke is missing should replace the composer.
  //
  // `local`, not `available`: with Node installed keke always "resolves", via
  // the `npx -y @milisp/keke@latest` fallback, which re-downloads the package
  // on every spawn and is why a bot could sit there doing nothing instead of
  // offering to install.
  const agents = useAcpAgents();
  const keke = agents?.find((a) => a.id === 'keke');
  const kekeMissing = !hasSession && ((keke !== undefined && !keke.local) || kekeSpawnFailed);

  if (kekeMissing) return <BotKekeInstall botName={bot.name} />;

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || running || connecting) return;

    // Reuse this bot's own process when the store is already pointed at it;
    // otherwise `open` restores or spawns it.
    const live =
      botConnection && botSession && connectionId === botConnection
        ? { connectionId: botConnection, sessionId: botSession }
        : await open(bot);
    if (!live) return;

    setText('');
    addEntry({ id: `u-${Date.now()}`, role: 'user', text: trimmed });
    setBotRunning(bot.id, true);
    setRunning(true);
    try {
      await acpPrompt(live.connectionId, live.sessionId, trimmed);
    } catch (e) {
      // Only the bot on screen owns the ACP store: a turn that ends while the
      // user is reading another bot must not write into that bot's pane.
      if (useBotUiStore.getState().selectedBotId === bot.id) {
        addEntry({ id: `e-${Date.now()}`, role: 'error', text: String(e) });
      }
    } finally {
      setBotRunning(bot.id, false);
      if (useBotUiStore.getState().selectedBotId === bot.id) setRunning(false);
    }
  };

  const stop = async () => {
    const connection = botConnection ?? connectionId;
    if (!connection) return;
    await acpCancel(connection, botSession ?? null).catch(() => {});
    setBotRunning(bot.id, false);
    setRunning(false);
  };

  return (
    <div className="shrink-0 border-t bg-background p-3">
      <div className="flex items-end gap-2 rounded-2xl border px-3 py-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // `isComposing` is what keeps Enter from sending mid-word while an
            // IME is still choosing characters.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={`Message ${bot.name}...`}
          rows={1}
          className="min-h-[24px] max-h-40 w-full resize-none bg-transparent text-base md:text-sm outline-none placeholder:text-muted-foreground"
        />
        {running ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={stop}>
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            disabled={!text.trim() || connecting}
            onClick={() => void send()}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
