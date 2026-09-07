import { useEffect, useRef } from 'react';
import { AcpToolCall } from '@/components/acp/AcpToolCall';
import type { Bot } from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { BotAvatar } from './BotAvatar';

/** The conversation, as chat bubbles: you on the right, the bot on the left. */
export function BotMessageList({ bot }: { bot: Bot }) {
  const { entries, connecting, running } = useAcpStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the count is the trigger, not a value the effect reads
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2 text-sm">
      {entries.length === 0 && !connecting && (
        <div className="py-10 text-center text-muted-foreground">
          <BotAvatar bot={bot} size="lg" className="mx-auto mb-2" />
          <div className="font-medium text-foreground">{bot.name}</div>
          {bot.title && <div className="text-xs">{bot.title}</div>}
          <div className="mt-2 text-xs">Say something to get started.</div>
        </div>
      )}

      {entries.map((entry) => {
        if (entry.role === 'tool') {
          return (
            <div key={entry.id} className="max-w-[85%]">
              <AcpToolCall entry={entry} />
            </div>
          );
        }

        if (entry.role === 'user') {
          return (
            <div key={entry.id} className="flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground">
                {entry.text}
              </div>
            </div>
          );
        }

        if (entry.role === 'error') {
          return (
            <div key={entry.id} className="px-1 py-1 text-xs text-destructive">
              {entry.text}
            </div>
          );
        }

        // A thought is the bot working, not the bot talking — kept quiet so the
        // conversation still reads as a conversation.
        if (entry.role === 'thought') {
          return (
            <div key={entry.id} className="px-1 text-xs italic text-muted-foreground">
              {entry.text}
            </div>
          );
        }

        return (
          <div key={entry.id} className="flex items-end gap-2">
            <BotAvatar bot={bot} size="sm" />
            <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-3 py-2">
              {entry.text}
            </div>
          </div>
        );
      })}

      {(connecting || running) && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <BotAvatar bot={bot} size="sm" />
          {connecting ? `Waking ${bot.name}…` : 'Typing…'}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
