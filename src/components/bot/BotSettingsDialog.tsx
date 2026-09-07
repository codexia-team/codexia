import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { type Bot, deleteBot, updateBot } from '@/services/apiAdapt/bots';
import { useBotUiStore } from '@/stores/useBotUiStore';
import { BotIdentityFields } from './BotIdentityFields';
import { BotModelFields } from './BotModelFields';
import { BotTrustFields } from './BotTrustFields';
import { useBotSettingsForm } from './useBotSettingsForm';

interface BotSettingsDialogProps {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BotSettingsDialog({ bot, open, onOpenChange }: BotSettingsDialogProps) {
  const { upsertBot, removeBot } = useBotUiStore();
  const form = useBotSettingsForm(bot, open);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      upsertBot(await updateBot(bot.id, form.patch));
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
          <BotIdentityFields
            name={form.name}
            onNameChange={form.setName}
            title={form.title}
            onTitleChange={form.setTitle}
            avatar={form.avatar}
            onAvatarChange={form.setAvatar}
            color={form.color}
            onColorChange={form.setColor}
            cwd={form.cwd}
            onCwdChange={form.setCwd}
          />

          <BotModelFields
            provider={form.provider}
            onProviderChange={form.setProvider}
            model={form.model}
            onModelChange={form.setModel}
            reasoningEffort={form.reasoningEffort}
            onReasoningEffortChange={form.setReasoningEffort}
          />

          <div className="space-y-1">
            <Label htmlFor="bot-prompt">Persona</Label>
            <Textarea
              id="bot-prompt"
              rows={4}
              value={form.systemPrompt}
              placeholder="Who this bot is, and how it should work."
              onChange={(e) => form.setSystemPrompt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Read after keke's own identity and before the project's AGENTS.md, so the repository
              still has the last word.
            </p>
          </div>

          <BotTrustFields
            trustLevel={form.trustLevel}
            onTrustLevelChange={form.setTrustLevel}
            approvedTools={form.approvedTools}
            onApprovedToolsChange={form.setApprovedTools}
          />
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
