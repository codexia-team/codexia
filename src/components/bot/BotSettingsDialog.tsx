import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectComponent as Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  type Bot,
  type BotTrustLevel,
  deleteBot,
  parseBotList,
  updateBot,
} from '@/services/apiAdapt/bots';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';
import { TRUST_LEVELS } from './botAgentDef';
import { BOT_AVATARS, BOT_COLORS } from './botDefaults';

interface BotSettingsDialogProps {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BotSettingsDialog({ bot, open, onOpenChange }: BotSettingsDialogProps) {
  const { upsertBot, removeBot } = useBotUiStore();
  // Accounts, models and reasoning efforts the live process actually offers.
  // Only populated while *this* bot's connection is the one currently open —
  // a bot that has never run, or isn't the live one, falls back to plain text.
  const connectionId = useAcpStore((s) => s.connectionId);
  const authMethods = useAcpStore((s) => s.authMethods);
  const models = useAcpStore((s) => s.models);
  const isLive = useBotUiStore(
    (s) => Boolean(connectionId) && s.connectionByBot[bot.id] === connectionId
  );

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
  const [saving, setSaving] = useState(false);

  // Reopening on another bot must not show the previous one's draft.
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

  const save = async () => {
    setSaving(true);
    try {
      upsertBot(
        await updateBot(bot.id, {
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
        })
      );
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not save', description: String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await deleteBot(bot.id);
      removeBot(bot.id);
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not delete', description: String(e), variant: 'destructive' });
    }
  };

  const availableModels = isLive ? (models?.availableModels ?? []) : [];
  const currentModelEfforts = availableModels.find((m) => m.modelId === model)?._meta
    ?.reasoningEfforts;
  // Bots don't hold a live account like the ACP composer's "Account" menu
  // does, but the accounts the connected process actually offers are the
  // realistic choices for `--provider`.
  const providerOptions = isLive ? authMethods : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bot.name}</DialogTitle>
          <DialogDescription>
            Settings take effect the next time this bot starts a conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bot-name">Name</Label>
              <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bot-title">Role</Label>
              <Input
                id="bot-title"
                value={title}
                placeholder="What it does"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Avatar</Label>
            <div className="flex flex-wrap gap-1">
              {BOT_AVATARS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-base ${
                    avatar === emoji ? 'border-primary bg-accent' : 'border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {BOT_COLORS.map((hex) => (
                <button
                  type="button"
                  key={hex}
                  aria-label={`Colour ${hex}`}
                  onClick={() => setColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-6 w-6 rounded-full ${
                    color === hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bot-cwd">Workspace</Label>
            <Input
              id="bot-cwd"
              value={cwd}
              placeholder="/path/to/project"
              onChange={(e) => setCwd(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bot-provider">Provider</Label>
              {providerOptions.length > 0 ? (
                <Select
                  value={provider}
                  onValueChange={setProvider}
                  placeholder="keke's default"
                  options={providerOptions.map((m) => ({ value: m.id, label: m.name }))}
                />
              ) : (
                <Input
                  id="bot-provider"
                  value={provider}
                  placeholder="keke's default"
                  onChange={(e) => setProvider(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="bot-model">Model</Label>
              {availableModels.length > 0 ? (
                <Select
                  value={model}
                  onValueChange={(value) => {
                    setModel(value);
                    // A model switch can invalidate the previous effort level.
                    const efforts = availableModels.find((m) => m.modelId === value)?._meta
                      ?.reasoningEfforts;
                    setReasoningEffort(efforts?.find((e) => e.default)?.id ?? '');
                  }}
                  placeholder="provider's default"
                  options={availableModels.map((m) => ({ value: m.modelId, label: m.name }))}
                />
              ) : (
                <>
                  <Input
                    id="bot-model"
                    value={model}
                    list="bot-model-options"
                    placeholder="provider's default"
                    onChange={(e) => setModel(e.target.value)}
                  />
                  <datalist id="bot-model-options">
                    {availableModels.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.name}
                      </option>
                    ))}
                  </datalist>
                </>
              )}
            </div>
            {currentModelEfforts && currentModelEfforts.length > 0 && (
              <div className="col-span-2 space-y-1">
                <Label htmlFor="bot-effort">Reasoning effort</Label>
                <Select
                  value={reasoningEffort}
                  onValueChange={setReasoningEffort}
                  placeholder="model's default"
                  options={currentModelEfforts.map((e) => ({
                    value: e.id,
                    label: e.label ?? e.id,
                  }))}
                />
              </div>
            )}
          </div>
          {!isLive && (
            <p className="text-xs text-muted-foreground">
              Open this bot's chat once to pick a provider and model from a live list — until then
              these are typed in by hand.
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="bot-prompt">Persona</Label>
            <Textarea
              id="bot-prompt"
              rows={4}
              value={systemPrompt}
              placeholder="Who this bot is, and how it should work."
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Read after keke's own identity and before the project's AGENTS.md, so the repository
              still has the last word.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Trust</Label>
            <div className="space-y-1">
              {TRUST_LEVELS.map((level) => (
                <button
                  type="button"
                  key={level.id}
                  onClick={() => setTrustLevel(level.id)}
                  className={`flex w-full flex-col items-start rounded-md border px-3 py-2 text-left ${
                    trustLevel === level.id ? 'border-primary bg-accent/60' : 'border-border'
                  }`}
                >
                  <span className="text-sm font-medium">{level.label}</span>
                  <span className="text-xs text-muted-foreground">{level.description}</span>
                </button>
              ))}
            </div>
          </div>

          {approvedTools.length > 0 && (
            <div className="space-y-1">
              <Label>Always allowed</Label>
              <div className="flex flex-wrap gap-1">
                {approvedTools.map((tool) => (
                  <span
                    key={tool}
                    className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                  >
                    {tool}
                    <button
                      type="button"
                      aria-label={`Stop always allowing ${tool}`}
                      onClick={() => setApprovedTools(approvedTools.filter((t) => t !== tool))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={remove}>
            Delete bot
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={save}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
