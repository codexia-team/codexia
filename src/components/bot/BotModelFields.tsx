import { AcpChoiceMenu } from '@/components/acp/AcpChoiceMenu';
import { Label } from '@/components/ui/label';
import { useBotOptionsStore } from '@/stores/useBotOptionsStore';

interface BotModelFieldsProps {
  provider: string;
  onProviderChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  reasoningEffort: string;
  onReasoningEffortChange: (value: string) => void;
}

/**
 * Account, model and reasoning effort for a bot — the composer's own
 * `AcpChoiceMenu`, driven by the cached catalogue instead of a live agent.
 * Picks land in the draft and are applied when the bot next starts, which is
 * the only difference from the composer's copy.
 */
export function BotModelFields({
  provider,
  onProviderChange,
  model,
  onModelChange,
  reasoningEffort,
  onReasoningEffortChange,
}: BotModelFieldsProps) {
  const catalogueAuthMethods = useBotOptionsStore((s) => s.authMethods);
  const catalogue = useBotOptionsStore((s) => s.configOptions);
  const models = useBotOptionsStore((s) => s.models);

  // The catalogue only carries what keke offers; what this bot has chosen
  // lives in the draft, so the current values are grafted on here.
  const configOptions = catalogue.map((option) => ({
    ...option,
    currentValue: option.category === 'thought_level' ? reasoningEffort : model,
    options: [
      { value: '', name: "keke's default", description: 'Whatever ~/.keke/config.toml selects' },
      ...(option.options ?? []),
    ],
  }));

  // A bot inherits keke's own `config.toml` choice unless it overrides one, so
  // the provider row must be able to go back to "no override" — signing in is
  // keke's business, not a bot setting.
  const authMethods = catalogueAuthMethods.length
    ? [
        { id: '', name: "keke's default", description: 'Whatever ~/.keke/config.toml selects' },
        ...catalogueAuthMethods,
      ]
    : [];

  const known = authMethods.length > 0 || configOptions.length > 0 || models !== null;

  return (
    <div className="space-y-1">
      <Label>Model</Label>
      {known ? (
        <div className="flex">
          <AcpChoiceMenu
            authMethods={authMethods}
            selectedAuthMethod={provider || null}
            onSelectAuthMethod={onProviderChange}
            configOptions={configOptions}
            onConfigOptionChange={(option, value) => {
              if (typeof value !== 'string') return;
              if (option.category === 'thought_level') onReasoningEffortChange(value);
              else {
                onModelChange(value);
                // A model switch can invalidate the previous effort level.
                onReasoningEffortChange('');
              }
            }}
            models={models ? { ...models, currentModelId: model } : null}
            reasoningEffort={reasoningEffort || null}
            onModelChange={(modelId, effort) => {
              onModelChange(modelId);
              onReasoningEffortChange(effort ?? '');
            }}
            accountLabel="Provider"
            noAccountLabel="keke's default"
            placeholder="keke's default"
            triggerClassName="flex max-w-full items-center gap-1 truncate rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Open a bot's chat once so keke can report the accounts and models it offers — the picker
          appears here afterwards, and until then the bot uses keke's defaults.
        </p>
      )}
    </div>
  );
}
