import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { acpRespondPermission } from '@/services/apiAdapt/acp';
import { type Bot, parseBotList, updateBot } from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';

/** What a standing approval is about. Falls back to the title when the agent
 *  reported no category, so the whitelist is never keyed on nothing. */
function approvalKey(title: string, toolKind?: string) {
  return toolKind ?? title;
}

/**
 * The bot's answer to a permission request.
 *
 * ACP's own `allow-always` lasts only as long as the session, which is no use
 * to a bot that is meant to keep working across restarts — so the standing
 * answer is stored on the bot and applied here. An auto-approval is always
 * announced in the transcript: a bot that quietly widens its own permissions
 * is exactly what the whitelist is supposed to make visible.
 */
export function BotPermissionGate({ bot }: { bot: Bot }) {
  const { connectionId, permission, setPermission, addEntry } = useAcpStore();
  const upsertBot = useBotUiStore((s) => s.upsertBot);
  // The request already auto-answered, so a re-render cannot answer it twice.
  const answered = useRef<string | null>(null);

  const approved = parseBotList(bot.approvedTools);

  useEffect(() => {
    if (!permission || !connectionId) return;
    if (answered.current === permission.requestId) return;

    const key = approvalKey(permission.title, permission.toolKind);
    if (!approved.includes(key)) return;

    answered.current = permission.requestId;
    setPermission(null);
    addEntry({
      id: `auto-${permission.requestId}`,
      role: 'thought',
      text: `Auto-approved ${key} — ${bot.name} has a standing approval for it.`,
    });
    void acpRespondPermission(connectionId, permission.requestId, 'allow');
  }, [permission, connectionId, approved, setPermission, addEntry, bot.name]);

  if (!permission || !connectionId) return null;

  const key = approvalKey(permission.title, permission.toolKind);
  if (approved.includes(key)) return null;

  const respond = async (optionId: string | null) => {
    setPermission(null);
    await acpRespondPermission(connectionId, permission.requestId, optionId);
  };

  const allowAlways = async () => {
    const next = [...approved, key];
    setPermission(null);
    await acpRespondPermission(connectionId, permission.requestId, 'allow');
    try {
      upsertBot(await updateBot(bot.id, { approvedTools: next }));
    } catch (e) {
      // The turn already went ahead; only the standing rule failed to stick.
      addEntry({
        id: `approve-${Date.now()}`,
        role: 'error',
        text: `Allowed this once, but could not remember it: ${String(e)}`,
      });
    }
  };

  return (
    <div className="shrink-0 border-t bg-muted/30 p-3 space-y-2">
      <div className="text-sm">{permission.title}</div>
      <div className="flex flex-wrap items-center gap-2">
        {permission.options.map((option) => (
          <Button key={option.optionId} size="sm" onClick={() => respond(option.optionId)}>
            {option.name}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={allowAlways}>
          Always allow {key}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => respond(null)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
