import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AcpAuthMethod,
  AcpConfigOption,
  AcpInitializeResult,
  AcpModelState,
  AcpSessionResult,
} from '@/services/apiAdapt/acp';

/**
 * The accounts, models and reasoning efforts keke last advertised.
 *
 * keke only reports these over a live connection, but a bot is configured
 * before it has ever run — including right after "New bot". Caching the last
 * live catalogue lets the settings dialog drive the very same `AcpChoiceMenu`
 * the composer uses, instead of falling back to free-text inputs.
 *
 * Stored in the agent's own shapes so no translation is needed at either end.
 */
interface BotOptionsStore {
  authMethods: AcpAuthMethod[];
  /** Model / effort options only; `currentValue` here is meaningless. */
  configOptions: AcpConfigOption[];
  models: AcpModelState | null;
  setCatalogue: (catalogue: {
    authMethods: AcpAuthMethod[];
    configOptions: AcpConfigOption[];
    models: AcpModelState | null;
  }) => void;
}

export const useBotOptionsStore = create<BotOptionsStore>()(
  persist(
    (set) => ({
      authMethods: [],
      configOptions: [],
      models: null,
      setCatalogue: ({ authMethods, configOptions, models }) =>
        set((state) => ({
          // A connection that advertises nothing must not wipe what we know.
          authMethods: authMethods.length ? authMethods : state.authMethods,
          configOptions: configOptions.length ? configOptions : state.configOptions,
          models: models?.availableModels.length ? models : state.models,
        })),
    }),
    { name: 'bot-options-storage', version: 2, migrate: () => ({}) as Partial<BotOptionsStore> }
  )
);

/** Record what a freshly opened keke session offers. */
export function captureBotOptions(
  initialize: AcpInitializeResult | null,
  session: AcpSessionResult | null
) {
  useBotOptionsStore.getState().setCatalogue({
    authMethods: initialize?.authMethods ?? [],
    // `mode` is per-conversation, not a bot setting; trust level covers it.
    configOptions: (session?.configOptions ?? []).filter(
      (o) =>
        o.category === 'model' || o.category === 'model_config' || o.category === 'thought_level'
    ),
    models: session?.models ?? null,
  });
}
