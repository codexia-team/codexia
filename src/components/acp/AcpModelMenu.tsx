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
import { toast } from '@/components/ui/use-toast';
import { useExternalUrl } from '@/features/plugins/hooks/useExternalUrl';
import {
  type AcpConfigOption,
  acpAuthenticate,
  acpSetConfigOption,
  acpSetModel,
} from '@/services/apiAdapt/acp';
import { useWorkspaceStore } from '@/stores';
import { useAcpStore } from '@/stores/useAcpStore';
import { acpFreshSession } from './newSession';

type ChoiceOption = { value: string; name: string; description?: string; effort: string | null };

/** Model id and reasoning effort share one select value. */
const EFFORT_SEPARATOR = '::';
const key = (modelId: string, effort: string | null) =>
  effort ? `${modelId}${EFFORT_SEPARATOR}${effort}` : modelId;

function findUrl(text: string): string | null {
  return text.match(/https?:\/\/\S+/)?.[0] ?? null;
}

/** Loose match between an auth method id (e.g. "grok") and a model id/name it likely owns. */
function ownedByMethod(text: string, methodId: string): boolean {
  return text.toLowerCase().includes(methodId.toLowerCase());
}

/**
 * Account, model and reasoning-effort in one dropdown — one trigger rather
 * than a row of separate pickers, mirroring grok-web-ui's `ModelSelector` /
 * `AccountMenu` split. Only `keke`'s `configOptions` path has been exercised
 * against a real agent; the legacy `models` flattening (Grok/Gemini) is
 * carried over unchanged from the previous per-slot control.
 *
 * There is no `signedIn` status from the backend — `authenticate` is
 * fire-and-forget — so "Account" only reflects the last method we asked for
 * and got no error back on, not a live read of the agent's session.
 */
export function AcpModelMenu() {
  const {
    connectionId,
    sessionId,
    models,
    configOptions,
    reasoningEffort,
    authMethods,
    authenticating,
    authNotice,
    selectedAuthMethod,
    setCurrentModel,
    setReasoningEffort,
    setConfigOptionValue,
    setAuthenticating,
    setSelectedAuthMethod,
  } = useAcpStore();
  const { openExternalUrl } = useExternalUrl();
  const cwd = useWorkspaceStore((s) => s.cwd);

  if (!connectionId || !sessionId) return null;

  // Update optimistically, then roll back if the agent rejects the change.
  const apply = async (revert: () => void, request: () => Promise<void>) => {
    try {
      await request();
    } catch (e) {
      revert();
      toast({ title: 'Agent rejected the change', description: String(e), variant: 'destructive' });
    }
  };

  // Read the session id fresh rather than closing over the render-time one —
  // `selectModelForMethod` calls these right after `acpFreshSession` swaps in
  // a new session id, and targeting the stale one would fail silently.
  const changeConfigOption = (option: AcpConfigOption, value: string | boolean) => {
    const previous = option.currentValue;
    setConfigOptionValue(option.id, value);
    return apply(
      () => setConfigOptionValue(option.id, previous),
      () => acpSetConfigOption(connectionId, useAcpStore.getState().sessionId, option.id, value)
    );
  };

  const changeModel = (modelId: string, effort: string | null) => {
    const previousModel = models?.currentModelId;
    const previousEffort = reasoningEffort;
    setCurrentModel(modelId);
    setReasoningEffort(effort);
    return apply(
      () => {
        if (previousModel) setCurrentModel(previousModel);
        setReasoningEffort(previousEffort);
      },
      () => acpSetModel(connectionId, useAcpStore.getState().sessionId, modelId, effort)
    );
  };

  // After switching account, pick a model that actually belongs to it — a
  // fresh session refreshes the *list*, but the agent's own "current" model
  // may still be the old provider's, and the list can mix every provider's
  // models together rather than filtering to the one just signed in to.
  const selectModelForMethod = async (methodId: string) => {
    const s = useAcpStore.getState();
    if (!s.connectionId || !s.sessionId) return;

    const modelOption = s.configOptions.find(
      (o) => o.category === 'model' || o.category === 'model_config'
    );
    if (modelOption?.options?.length) {
      const match =
        modelOption.options.find(
          (o) => ownedByMethod(o.value, methodId) || ownedByMethod(o.name, methodId)
        ) ?? modelOption.options[0];
      if (match.value !== modelOption.currentValue) {
        // Effort choices can depend on the model (thought_level is often
        // model-specific), so wait for the agent's response — and re-read the
        // store rather than the `s` snapshot from before the change — instead
        // of reading a list that was still the previous model's.
        await changeConfigOption(modelOption, match.value);
      }
      const effortOption = useAcpStore
        .getState()
        .configOptions.find((o) => o.category === 'thought_level');
      if (
        effortOption?.options?.length &&
        effortOption.options[0].value !== effortOption.currentValue
      ) {
        changeConfigOption(effortOption, effortOption.options[0].value);
      }
      return;
    }

    if (s.models?.availableModels.length) {
      const match =
        s.models.availableModels.find(
          (m) => ownedByMethod(m.modelId, methodId) || ownedByMethod(m.name, methodId)
        ) ?? s.models.availableModels[0];
      const efforts = match._meta?.reasoningEfforts ?? [];
      const effort = efforts.find((e) => e.default)?.id ?? efforts[0]?.id ?? null;
      changeModel(match.modelId, effort);
    }
  };

  const signIn = async (methodId: string) => {
    if (authenticating) return;
    setAuthenticating(methodId);
    try {
      await acpAuthenticate(connectionId, methodId);
      setSelectedAuthMethod(methodId);
      // The agent's model list is scoped to whichever account is active —
      // switching, say, ollama to grok only shows grok's models once a fresh
      // session picks that up, same as `initialize`/`session/new` did originally.
      if (cwd) await acpFreshSession(connectionId, cwd);
      await selectModelForMethod(methodId);
    } catch {
      // acpAuthenticate already toasts the failure.
    } finally {
      setAuthenticating(null);
    }
  };

  const nonModeOptions = configOptions.filter((o) => o.category !== 'mode');

  // Effort belongs to a model, so expand each model that offers levels into
  // one entry per level rather than pairing the picker with a second menu.
  const modelChoices: ChoiceOption[] = (models?.availableModels ?? []).flatMap<ChoiceOption>(
    (m) => {
      const efforts = m._meta?.reasoningEfforts ?? [];
      if (!efforts.length) {
        return [{ value: m.modelId, name: m.name, description: m.description, effort: null }];
      }
      return efforts.map((e) => ({
        value: key(m.modelId, e.id),
        name: `${m.name} · ${(e.label ?? e.id).replace(/\s*effort$/i, '')}`,
        description: e.description ?? m.description,
        effort: e.id,
      }));
    }
  );
  const currentModelChoice = models
    ? (modelChoices.find((c) => c.value === key(models.currentModelId, reasoningEffort)) ??
      modelChoices.find((c) => c.value.startsWith(models.currentModelId)))
    : undefined;

  if (nonModeOptions.length === 0 && modelChoices.length === 0 && authMethods.length === 0)
    return null;

  const modelCategoryOption = nonModeOptions.find(
    (o) => o.category === 'model' || o.category === 'model_config'
  );
  const modelCategoryLabel = modelCategoryOption
    ? (modelCategoryOption.options?.find((o) => o.value === modelCategoryOption.currentValue)
        ?.name ?? String(modelCategoryOption.currentValue))
    : null;
  const effortCategoryOption = nonModeOptions.find((o) => o.category === 'thought_level');
  const effortCategoryLabel = effortCategoryOption
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
      (authMethods.length ? 'Sign in' : null));
  const triggerLabel = modelLabel ?? accountLabel;

  const noticeUrl = authNotice ? findUrl(authNotice) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-40 items-center gap-1 truncate rounded-sm px-2 py-1 text-xs transition-colors hover:bg-accent">
        {triggerLabel ?? 'Model'}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48 max-w-64" align="end">
        <DropdownMenuGroup>
          {authMethods.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex w-full items-center justify-between pr-1">
                  <span>Account</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {accountLabel ?? 'Not signed in'}
                  </span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40 max-w-64">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                {authMethods.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    title={m.description ?? undefined}
                    disabled={authenticating !== null}
                    className={selectedAuthMethod === m.id ? 'bg-accent' : undefined}
                    onSelect={(e) => {
                      e.preventDefault();
                      void signIn(m.id);
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
                  onCheckedChange={(checked) => changeConfigOption(option, checked)}
                />
              </label>
            ) : (
              <DropdownMenuSub key={option.id}>
                <DropdownMenuSubTrigger>
                  <div className="flex w-full items-center justify-between pr-1">
                    <span>{option.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {String(option.currentValue)}
                    </span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-40 max-w-64">
                  {(option.options ?? []).map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      title={o.description}
                      className={option.currentValue === o.value ? 'bg-accent' : undefined}
                      onClick={() => changeConfigOption(option, o.value)}
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
                    onClick={() => changeModel(c.value.split(EFFORT_SEPARATOR)[0], c.effort)}
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
