import type { AcpAgentDef } from '@/services/apiAdapt/acp';
import type { Bot, BotTrustLevel } from '@/services/apiAdapt/bots';

/** How much a bot may do on its own, in keke's own vocabulary. */
const TRUST: Record<BotTrustLevel, { approvalPolicy: string; sandboxMode: string }> = {
  read_only: { approvalPolicy: 'on-request', sandboxMode: 'read_only' },
  ask: { approvalPolicy: 'on-request', sandboxMode: 'workspace_write' },
  autonomous: { approvalPolicy: 'never', sandboxMode: 'workspace_write' },
};

export function trustFor(bot: Bot) {
  return TRUST[bot.trustLevel] ?? TRUST.ask;
}

export const TRUST_LEVELS: Array<{ id: BotTrustLevel; label: string; description: string }> = [
  {
    id: 'read_only',
    label: 'Read-only',
    description: 'Reads and answers. Cannot change files.',
  },
  { id: 'ask', label: 'Ask before writing', description: 'Asks before anything that writes.' },
  {
    id: 'autonomous',
    label: 'Autonomous',
    description: 'Works unattended in its own workspace.',
  },
];

/**
 * The process definition for one bot.
 *
 * keke has no notion of a named agent, so a bot's identity is handed over the
 * two seams keke does have: spawn arguments, and `KEKE_INSTRUCTIONS`, which
 * keke joins into the system prompt after its own identity and before the
 * project's `AGENTS.md`.
 *
 * `keke` is the resolved `keke` preset from `acpListAgents` — its launcher
 * (local binary, or the `npx` fallback) is reused as-is so a bot without a
 * local install still runs, the same way the ACP composer's "Download & run"
 * does.
 */
export function botAgentDef(bot: Bot, keke: AcpAgentDef): AcpAgentDef {
  const args = [...keke.args];
  if (bot.cwd) args.push('-C', bot.cwd);
  if (bot.provider) args.push('--provider', bot.provider);

  const env: Record<string, string> = { ...keke.env };
  if (bot.systemPrompt?.trim()) env.KEKE_INSTRUCTIONS = bot.systemPrompt;

  return {
    id: `keke-bot-${bot.id}`,
    name: bot.name,
    command: keke.command,
    args,
    env,
    available: keke.available,
  };
}
