import { useEffect, useState } from 'react';
import { type Bot, type BotTrustLevel, parseBotList } from '@/services/apiAdapt/bots';

/**
 * The editable copy of a bot's settings. Reopening the dialog on another bot
 * must not show the previous one's draft, so the form is reset whenever the
 * dialog opens or the bot behind it changes.
 */
export function useBotSettingsForm(bot: Bot, open: boolean) {
  const [name, setName] = useState(bot.name);
  const [title, setTitle] = useState(bot.title ?? '');
  const [avatar, setAvatar] = useState(bot.avatar);
  const [color, setColor] = useState(bot.color);
  const [cwd, setCwd] = useState(bot.cwd);
  const [provider, setProvider] = useState(bot.provider ?? '');
  const [model, setModel] = useState(bot.model ?? '');
  const [reasoningEffort, setReasoningEffort] = useState(bot.reasoningEffort ?? '');
  const [systemPrompt, setSystemPrompt] = useState(bot.systemPrompt ?? '');
  const [trustLevel, setTrustLevel] = useState<BotTrustLevel>(bot.trustLevel);
  const [approvedTools, setApprovedTools] = useState(parseBotList(bot.approvedTools));

  useEffect(() => {
    if (!open) return;
    setName(bot.name);
    setTitle(bot.title ?? '');
    setAvatar(bot.avatar);
    setColor(bot.color);
    setCwd(bot.cwd);
    setProvider(bot.provider ?? '');
    setModel(bot.model ?? '');
    setReasoningEffort(bot.reasoningEffort ?? '');
    setSystemPrompt(bot.systemPrompt ?? '');
    setTrustLevel(bot.trustLevel);
    setApprovedTools(parseBotList(bot.approvedTools));
  }, [open, bot]);

  return {
    name,
    setName,
    title,
    setTitle,
    avatar,
    setAvatar,
    color,
    setColor,
    cwd,
    setCwd,
    provider,
    setProvider,
    model,
    setModel,
    reasoningEffort,
    setReasoningEffort,
    systemPrompt,
    setSystemPrompt,
    trustLevel,
    setTrustLevel,
    approvedTools,
    setApprovedTools,
    /** The patch `updateBot` takes, with the bot's own name kept if cleared. */
    patch: {
      name: name.trim() || bot.name,
      title,
      avatar,
      color,
      cwd,
      provider,
      model,
      reasoningEffort,
      systemPrompt,
      trustLevel,
      approvedTools,
    },
  };
}
