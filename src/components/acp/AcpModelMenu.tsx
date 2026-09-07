import { toast } from '@/components/ui/use-toast';
import {
  type AcpConfigOption,
  acpAuthenticate,
  acpSetConfigOption,
  acpSetModel,
} from '@/services/apiAdapt/acp';
import { useWorkspaceStore } from '@/stores';
import { useAcpStore } from '@/stores/useAcpStore';
import { AcpChoiceMenu } from './AcpChoiceMenu';
import { acpFreshSession } from './newSession';

/** Loose match between an auth method id (e.g. "grok") and a model id/name it likely owns. */
function ownedByMethod(text: string, methodId: string): boolean {
  return text.toLowerCase().includes(methodId.toLowerCase());
}

/**
 * The composer's account/model/effort menu, wired to the live connection:
 * every pick is applied to the running agent straight away, and reverted if
 * the agent rejects it. `AcpChoiceMenu` does the rendering.
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
  const cwd = useWorkspaceStore((s) => s.cwd);

  if (!connectionId || !sessionId) return null;

  const apply = async (revert: () => void, request: () => Promise<void>) => {
    try {
      await request();
    } catch (e) {
      revert();
      toast({ title: 'Agent rejected the change', description: String(e), variant: 'destructive' });
    }
  };

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

  return (
    <AcpChoiceMenu
      authMethods={authMethods}
      selectedAuthMethod={selectedAuthMethod}
      onSelectAuthMethod={(methodId) => void signIn(methodId)}
      authenticating={authenticating}
      authNotice={authNotice}
      configOptions={configOptions}
      onConfigOptionChange={changeConfigOption}
      models={models}
      reasoningEffort={reasoningEffort}
      onModelChange={changeModel}
    />
  );
}
