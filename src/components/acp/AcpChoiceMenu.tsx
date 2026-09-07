import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useExternalUrl } from '@/features/plugins/hooks/useExternalUrl';
import type { AcpAuthMethod, AcpConfigOption, AcpModelState } from '@/services/apiAdapt/acp';
import { EFFORT_SEPARATOR, effortKey, modelChoicesFor } from './modelChoices';

function findUrl(text: string): string | null {
  return text.match(/https?:\/\/\S+/)?.[0] ?? null;
}

interface AcpChoiceMenuProps {
  /** Accounts the agent advertises. Empty hides the Account submenu. */
  authMethods: AcpAuthMethod[];
  selectedAuthMethod: string | null;
  onSelectAuthMethod: (methodId: string) => void;
  /** Id of the account currently signing in, for the live composer only. */
  authenticating?: string | null;
  authNotice?: string | null;
  configOptions: AcpConfigOption[];
  onConfigOptionChange: (option: AcpConfigOption, value: string | boolean) => void;
  models: AcpModelState | null;
  reasoningEffort: string | null;
  onModelChange: (modelId: string, effort: string | null) => void;
  /** Name of the account row. Bots pick a provider rather than sign in. */
  accountLabel?: string;
  /** What the account row reads when nothing is picked. */
  noAccountLabel?: string;
  /** Shown on the trigger when nothing is picked yet. */
  placeholder?: string;
  triggerClassName?: string;
}

/**
 * Account, model and reasoning effort in one dropdown — one trigger rather
 * than a row of separate pickers.
 *
 * Presentation only: it renders whatever choices it is handed and reports
 * picks back. `AcpModelMenu` wires it to a live connection (each pick is an
 * immediate RPC); the bot settings dialog wires it to a stored draft for an
 * agent that isn't running.
 */
export function AcpChoiceMenu({
  authMethods,
  selectedAuthMethod,
  onSelectAuthMethod,
  authenticating = null,
  authNotice = null,
  configOptions,
  onConfigOptionChange,
  models,
  reasoningEffort,
  onModelChange,
  accountLabel: accountLabelText = 'Account',
  noAccountLabel = 'Sign in',
  placeholder = 'Model',
  triggerClassName = 'flex max-w-40 items-center gap-1 truncate rounded-sm px-2 py-1 text-xs transition-colors hover:bg-accent',
}: AcpChoiceMenuProps) {
  const { openExternalUrl } = useExternalUrl();

  const nonModeOptions = configOptions.filter((o) => o.category !== 'mode');
  const modelChoices = modelChoicesFor(models);
  const currentModelChoice = models
    ? (modelChoices.find((c) => c.value === effortKey(models.currentModelId, reasoningEffort)) ??
      modelChoices.find((c) => c.value.startsWith(models.currentModelId)))
    : undefined;

  if (nonModeOptions.length === 0 && modelChoices.length === 0 && authMethods.length === 0)
    return null;

  const modelCategoryOption = nonModeOptions.find(
    (o) => o.category === 'model' || o.category === 'model_config'
  );
  const modelCategoryLabel = modelCategoryOption?.currentValue
    ? (modelCategoryOption.options?.find((o) => o.value === modelCategoryOption.currentValue)
        ?.name ?? String(modelCategoryOption.currentValue))
    : null;
  const effortCategoryOption = nonModeOptions.find((o) => o.category === 'thought_level');
  const effortCategoryLabel = effortCategoryOption?.currentValue
    ? (effortCategoryOption.options?.find((o) => o.value === effortCategoryOption.currentValue)
        ?.name ?? String(effortCategoryOption.currentValue))
    : null;
  // `currentModelChoice.name` already folds the effort in for the legacy
  // `models` mechanism (e.g. "Grok 4 · High"); the `configOptions` one keeps
  // model and effort as separate options, so pair them here instead.
  const modelLabel = modelCategoryLabel
    ? effortCategoryLabel
      ? `${modelCategoryLabel} · ${effortCategoryLabel}`
      : modelCategoryLabel
    : (currentModelChoice?.name ?? models?.currentModelId ?? null);
  const accountLabel = authenticating
    ? 'Signing in…'
    : (authMethods.find((m) => m.id === selectedAuthMethod)?.name ??
      (authMethods.length ? noAccountLabel : null));
  const triggerLabel = modelLabel ?? accountLabel;

  const noticeUrl = authNotice ? findUrl(authNotice) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClassName}>
        {triggerLabel ?? placeholder}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48 max-w-64" align="end">
        <DropdownMenuGroup>
          {authMethods.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex w-full items-center justify-between pr-1">
                  <span>{accountLabelText}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {accountLabel ?? noAccountLabel}
                  </span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40 max-w-64">
                <DropdownMenuLabel>{accountLabelText}</DropdownMenuLabel>
                {authMethods.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    title={m.description ?? undefined}
                    disabled={authenticating !== null}
                    className={selectedAuthMethod === m.id ? 'bg-accent' : undefined}
                    onSelect={(e) => {
                      e.preventDefault();
                      onSelectAuthMethod(m.id);
                    }}
                  >
                    <span>{m.name}</span>
                    {authenticating === m.id && (
                      <span className="ml-auto text-xs text-muted-foreground">…</span>
                    )}
                  </DropdownMenuItem>
                ))}
                {authenticating && authNotice && (
                  <div className="px-2 py-1 text-xs break-words text-muted-foreground">
                    {noticeUrl ? (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => openExternalUrl(noticeUrl)}
                      >
                        Open this link to sign in
                      </button>
                    ) : (
                      authNotice
                    )}
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {nonModeOptions.map((option) =>
            option.type === 'boolean' ? (
              <label
                key={option.id}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground"
                title={option.description}
              >
                <span className="flex-1">{option.name}</span>
                <Switch
                  checked={option.currentValue === true}
                  onCheckedChange={(checked) => onConfigOptionChange(option, checked)}
                />
              </label>
            ) : (
              <DropdownMenuSub key={option.id}>
                <DropdownMenuSubTrigger>
                  <div className="flex w-full items-center justify-between pr-1">
                    <span>{option.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {String(option.currentValue ?? '')}
                    </span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-40 max-w-64">
                  {(option.options ?? []).map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      title={o.description}
                      className={option.currentValue === o.value ? 'bg-accent' : undefined}
                      onClick={() => onConfigOptionChange(option, o.value)}
                    >
                      {o.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          )}

          {configOptions.length === 0 && modelChoices.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex w-full items-center justify-between pr-1">
                  <span>Model</span>
                  <span className="max-w-28 truncate text-xs font-normal text-muted-foreground">
                    {currentModelChoice?.name ?? models?.currentModelId}
                  </span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-48 max-w-72">
                {modelChoices.map((c) => (
                  <DropdownMenuItem
                    key={c.value}
                    title={c.description}
                    className={currentModelChoice?.value === c.value ? 'bg-accent' : undefined}
                    onClick={() => onModelChange(c.value.split(EFFORT_SEPARATOR)[0], c.effort)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
