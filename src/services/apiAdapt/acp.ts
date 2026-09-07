import { getJson, postJson, postJsonWithOptions, postNoContent } from './shared';

export type AcpAgentDef = {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  available: boolean;
  /**
   * The agent's own binary resolved, rather than the `npx` download fallback.
   * `available` is true whenever *anything* can be spawned — with Node
   * installed that is every npm-published agent — so a caller asking "is this
   * installed?" wants this instead.
   */
  local?: boolean;
};

export type AcpAuthMethod = {
  id: string;
  name: string;
  description?: string | null;
};

export type AcpInitializeResult = {
  protocolVersion?: number;
  agentInfo?: { name?: string; title?: string; version?: string };
  authMethods?: AcpAuthMethod[];
  agentCapabilities?: Record<string, unknown>;
};

/** `modes` on the `session/new` result — the older, mode-only mechanism. */
export type AcpModeState = {
  currentModeId: string;
  availableModes: Array<{ id: string; name: string; description?: string }>;
};

/** A reasoning-effort level, advertised per model under `_meta` (Grok). */
export type AcpReasoningEffort = {
  id: string;
  label?: string;
  description?: string;
  default?: boolean;
};

export type AcpModel = {
  modelId: string;
  name: string;
  description?: string;
  _meta?: { reasoningEfforts?: AcpReasoningEffort[] };
};

/** `models` on the `session/new` result. */
export type AcpModelState = {
  currentModelId: string;
  availableModels: AcpModel[];
};

/**
 * `configOptions` — the generic mechanism that supersedes `modes`/`models`.
 * Agents expose mode, model and reasoning effort through it uniformly.
 */
export type AcpConfigOption = {
  id: string;
  name: string;
  description?: string;
  category?: 'mode' | 'model' | 'model_config' | 'thought_level' | string;
  type: 'select' | 'boolean';
  currentValue: string | boolean;
  options?: Array<{ value: string; name: string; description?: string }>;
};

export type AcpSessionResult = {
  sessionId: string;
  modes?: AcpModeState;
  models?: AcpModelState;
  configOptions?: AcpConfigOption[];
};

export type AcpStartResult = {
  connectionId: string;
  sessionId: string | null;
  initialize: AcpInitializeResult;
  session: AcpSessionResult | null;
  sessionError: string | null;
};

export async function acpListAgents() {
  return await getJson<AcpAgentDef[]>('/api/acp/agents');
}

/**
 * Install an agent's npm package globally. Returns the re-resolved def, whose
 * `available` says whether it now runs from PATH.
 */
export async function acpInstallAgent(agentId: string) {
  return await postJson<AcpAgentDef>('/api/acp/install-agent', { agent_id: agentId });
}

/**
 * `custom` replaces the preset with a definition of its own — how a bot gets
 * its own process, with its persona in the environment. `botId` files every
 * session the connection opens under that bot instead of under the project.
 */
export async function acpStart(agentId: string, cwd: string, custom?: AcpAgentDef, botId?: string) {
  // Every caller already turns a rejection into its own UI (a toast, or —
  // for a bot whose keke can't spawn — an inline install prompt instead of
  // one); the generic "Request failed" toast this helper would otherwise
  // show first only duplicates or preempts that.
  return await postJsonWithOptions<AcpStartResult>(
    '/api/acp/start',
    {
      agent_id: agentId,
      cwd,
      custom: custom ?? null,
      bot_id: botId ?? null,
    },
    { suppressToast: true }
  );
}

/**
 * One connection can host several sessions, so every session-scoped call names
 * the session it targets. `null` falls back to the connection's newest session.
 */
export async function acpPrompt(connectionId: string, sessionId: string | null, text: string) {
  return await postJson<{ stopReason?: string }>('/api/acp/prompt', {
    connection_id: connectionId,
    session_id: sessionId,
    text,
  });
}

export async function acpCancel(connectionId: string, sessionId: string | null) {
  await postNoContent('/api/acp/cancel', {
    connection_id: connectionId,
    session_id: sessionId,
  });
}

export async function acpAuthenticate(connectionId: string, methodId: string) {
  await postNoContent('/api/acp/authenticate', {
    connection_id: connectionId,
    method_id: methodId,
  });
}

export async function acpNewSession(connectionId: string, cwd: string) {
  return await postJson<AcpSessionResult>('/api/acp/new-session', {
    connection_id: connectionId,
    cwd,
  });
}

/** A persisted session, as listed in the sidebar. */
export type AcpSessionRecord = {
  botId?: string | null;
  sessionId: string;
  agentId: string;
  agentTitle: string | null;
  cwd: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Resume a stored session. Only works when `agentCapabilities.loadSession`. */
export async function acpLoadSession(connectionId: string, sessionId: string, cwd: string) {
  return await postJson<AcpSessionResult>('/api/acp/load-session', {
    connection_id: connectionId,
    session_id: sessionId,
    cwd,
  });
}

export async function acpListSessions(cwd?: string, limit?: number) {
  return await postJson<AcpSessionRecord[]>('/api/acp/sessions', {
    cwd: cwd ?? null,
    limit: limit ?? null,
  });
}

/** The stored transcript: raw `session/update` payloads in arrival order. */
export async function acpGetSession(sessionId: string) {
  return await postJson<Array<Record<string, unknown>>>('/api/acp/session', {
    session_id: sessionId,
  });
}

export async function acpDeleteSession(sessionId: string) {
  await postNoContent('/api/acp/delete-session', {
    session_id: sessionId,
  });
}

export async function acpSetMode(connectionId: string, sessionId: string | null, modeId: string) {
  await postJson('/api/acp/set-mode', {
    connection_id: connectionId,
    session_id: sessionId,
    mode_id: modeId,
  });
}

export async function acpSetModel(
  connectionId: string,
  sessionId: string | null,
  modelId: string,
  reasoningEffort?: string | null
) {
  await postJson('/api/acp/set-model', {
    connection_id: connectionId,
    session_id: sessionId,
    model_id: modelId,
    reasoning_effort: reasoningEffort ?? null,
  });
}

export async function acpSetConfigOption(
  connectionId: string,
  sessionId: string | null,
  configId: string,
  value: string | boolean
) {
  await postJson('/api/acp/set-config-option', {
    connection_id: connectionId,
    session_id: sessionId,
    config_id: configId,
    value,
  });
}

export async function acpRespondPermission(
  connectionId: string,
  requestId: string,
  optionId: string | null
) {
  await postNoContent('/api/acp/respond-permission', {
    connection_id: connectionId,
    request_id: requestId,
    option_id: optionId,
  });
}

export async function acpStop(connectionId: string) {
  await postNoContent('/api/acp/stop', { connection_id: connectionId });
}
