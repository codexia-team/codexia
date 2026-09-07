import { create } from 'zustand';
import type {
  AcpAuthMethod,
  AcpConfigOption,
  AcpModelState,
  AcpModeState,
  AcpSessionResult,
} from '@/services/apiAdapt/acp';

/** A `toolCall.content` item, as sent by `tool_call` / `tool_call_update`. */
export type AcpToolContent =
  | { type: 'content'; content: { type: string; text?: string; uri?: string } }
  | { type: 'diff'; path: string; oldText: string | null; newText: string }
  | { type: 'terminal'; terminalId: string };

/** A file location a tool call touched, used to render `file:line` links. */
export type AcpToolLocation = { path: string; line?: number };

/** A rendered line in the ACP transcript. */
export type AcpEntry =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'agent'; text: string }
  | { id: string; role: 'thought'; text: string }
  | { id: string; role: 'error'; text: string }
  | {
      id: string;
      role: 'tool';
      toolCallId: string;
      title: string;
      status: string;
      kind?: string;
      content?: AcpToolContent[];
      locations?: AcpToolLocation[];
      rawInput?: unknown;
      rawOutput?: unknown;
    };

export type AcpPermissionOption = { optionId: string; name: string; kind?: string };

export type AcpPermissionRequest = {
  requestId: string;
  title: string;
  /** The tool call's category (`read`, `edit`, `execute`, ...) when the agent
   * reported one. Coarse on purpose: it is the unit a standing "always allow"
   * can be about, where a per-call title never repeats. */
  toolKind?: string;
  options: AcpPermissionOption[];
};

interface AcpStore {
  /**
   * Whether the chat pane is driven by an ACP agent. ACP is a protocol, not an
   * agent, so this is a dimension next to `selectedAgent` rather than a value
   * inside it — everything else (sidebar, MCP config, skills) keeps targeting
   * the codex/cc agent the user last picked.
   */
  active: boolean;
  /** Currently selected ACP agent preset id. */
  agentId: string;
  connectionId: string | null;
  sessionId: string | null;
  agentTitle: string | null;
  authMethods: AcpAuthMethod[];
  /** `agentCapabilities.loadSession`: whether stored sessions can be resumed. */
  canLoadSession: boolean;
  connecting: boolean;
  running: boolean;
  entries: AcpEntry[];
  /** Set by `sealChunk`: the next chunk starts a new entry. */
  chunkSealed: boolean;
  permission: AcpPermissionRequest | null;

  /** Session controls advertised by the agent. */
  modes: AcpModeState | null;
  models: AcpModelState | null;
  configOptions: AcpConfigOption[];
  /** Selected reasoning effort for agents that scope it to a model (Grok). */
  reasoningEffort: string | null;
  /** Id of the auth method currently being signed in, or null when idle. */
  authenticating: string | null;
  /** Latest stderr/notification text seen while `authenticating`, e.g. a login link. */
  authNotice: string | null;
  /**
   * Id of the `authMethods` entry the last successful `authenticate` call
   * used. The agent reports no signed-in status back, so this is only a
   * record of what we asked for and got no error back for — not a live read
   * of server-side auth state.
   */
  selectedAuthMethod: string | null;
  /**
   * Bumped by `restart` to tell the composer this teardown was deliberate and
   * it should auto-connect again, instead of treating the agent as already
   * attempted and leaving the pane disconnected.
   */
  restartNonce: number;

  setActive: (v: boolean) => void;
  setAgentId: (id: string) => void;
  setConnection: (v: {
    connectionId: string;
    sessionId: string | null;
    agentTitle: string | null;
    authMethods: AcpAuthMethod[];
    canLoadSession?: boolean;
  }) => void;
  setSessionId: (id: string | null) => void;
  /** Apply the `session/new` result: session id plus the available controls. */
  applySession: (session: AcpSessionResult | null) => void;
  setCurrentMode: (modeId: string) => void;
  setCurrentModel: (modelId: string) => void;
  setConfigOptions: (options: AcpConfigOption[]) => void;
  setReasoningEffort: (effort: string | null) => void;
  setConfigOptionValue: (configId: string, value: string | boolean) => void;
  setAuthenticating: (methodId: string | null) => void;
  setAuthNotice: (text: string | null) => void;
  appendAuthNotice: (text: string) => void;
  setSelectedAuthMethod: (methodId: string | null) => void;
  setConnecting: (v: boolean) => void;
  setRunning: (v: boolean) => void;
  setPermission: (p: AcpPermissionRequest | null) => void;
  addEntry: (entry: AcpEntry) => void;
  setEntries: (entries: AcpEntry[]) => void;
  /** Append to the last entry when it has the same streaming role, else push. */
  appendChunk: (role: 'agent' | 'thought', text: string) => void;
  /**
   * Keep the next chunk from merging into the last entry. Used at the seam
   * between two replayed transcripts, whose chunks are separate turns even
   * though they share a role.
   */
  sealChunk: () => void;
  /** Merge a `tool_call` / `tool_call_update`: absent fields keep their value. */
  upsertToolCall: (tool: {
    toolCallId: string;
    title?: string;
    status?: string;
    kind?: string;
    content?: AcpToolContent[];
    locations?: AcpToolLocation[];
    rawInput?: unknown;
    rawOutput?: unknown;
  }) => void;
  reset: () => void;
  /** Clear the session and ask the composer to open a fresh one. */
  restart: () => void;
}

const newId = () => Math.random().toString(36).slice(2);

/** Everything tied to a live connection, back to its disconnected state. */
const cleared = {
  connectionId: null,
  sessionId: null,
  agentTitle: null,
  authMethods: [],
  canLoadSession: false,
  connecting: false,
  running: false,
  entries: [],
  chunkSealed: false,
  permission: null,
  modes: null,
  models: null,
  configOptions: [],
  reasoningEffort: null,
  authenticating: null,
  authNotice: null,
  selectedAuthMethod: null,
} satisfies Partial<AcpStore>;

export const useAcpStore = create<AcpStore>((set) => ({
  active: false,
  agentId: 'gemini',
  connectionId: null,
  sessionId: null,
  agentTitle: null,
  authMethods: [],
  canLoadSession: false,
  connecting: false,
  running: false,
  entries: [],
  chunkSealed: false,
  permission: null,
  modes: null,
  models: null,
  configOptions: [],
  reasoningEffort: null,
  authenticating: null,
  authNotice: null,
  selectedAuthMethod: null,
  restartNonce: 0,

  setActive: (active) => set({ active }),
  setAgentId: (agentId) => set({ agentId }),
  setConnection: ({ connectionId, sessionId, agentTitle, authMethods, canLoadSession }) =>
    set({
      connectionId,
      sessionId,
      agentTitle,
      authMethods,
      canLoadSession: canLoadSession ?? false,
      connecting: false,
    }),
  setSessionId: (sessionId) => set({ sessionId }),

  applySession: (session) =>
    set({
      sessionId: session?.sessionId ?? null,
      modes: session?.modes ?? null,
      models: session?.models ?? null,
      configOptions: session?.configOptions ?? [],
      reasoningEffort:
        session?.models?.availableModels
          .find((m) => m.modelId === session.models?.currentModelId)
          ?._meta?.reasoningEfforts?.find((e) => e.default)?.id ?? null,
    }),

  setCurrentMode: (currentModeId) =>
    set((s) => (s.modes ? { modes: { ...s.modes, currentModeId } } : {})),

  setCurrentModel: (currentModelId) =>
    set((s) => (s.models ? { models: { ...s.models, currentModelId } } : {})),

  setConfigOptions: (configOptions) => set({ configOptions }),

  setReasoningEffort: (reasoningEffort) => set({ reasoningEffort }),

  setConfigOptionValue: (configId, value) =>
    set((s) => ({
      configOptions: s.configOptions.map((o) =>
        o.id === configId ? { ...o, currentValue: value } : o
      ),
    })),
  setAuthenticating: (authenticating) => set({ authenticating, authNotice: null }),
  setAuthNotice: (authNotice) => set({ authNotice }),
  appendAuthNotice: (text) =>
    set((s) => ({ authNotice: s.authNotice ? `${s.authNotice}\n${text}` : text })),
  setSelectedAuthMethod: (selectedAuthMethod) => set({ selectedAuthMethod }),
  setConnecting: (connecting) => set({ connecting }),
  setRunning: (running) => set({ running }),
  setPermission: (permission) => set({ permission }),
  addEntry: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
  setEntries: (entries) => set({ entries, chunkSealed: false }),

  sealChunk: () => set({ chunkSealed: true }),

  appendChunk: (role, text) =>
    set((s) => {
      const last = s.entries[s.entries.length - 1];
      if (last && last.role === role && !s.chunkSealed) {
        const updated = { ...last, text: last.text + text };
        return { entries: [...s.entries.slice(0, -1), updated], chunkSealed: false };
      }
      return { entries: [...s.entries, { id: newId(), role, text }], chunkSealed: false };
    }),

  upsertToolCall: ({ toolCallId, title, status, kind, content, locations, rawInput, rawOutput }) =>
    set((s) => {
      const idx = s.entries.findIndex((e) => e.role === 'tool' && e.toolCallId === toolCallId);
      if (idx === -1) {
        return {
          entries: [
            ...s.entries,
            {
              id: newId(),
              role: 'tool',
              toolCallId,
              title: title ?? toolCallId,
              status: status ?? 'pending',
              kind,
              content,
              locations,
              rawInput,
              rawOutput,
            },
          ],
        };
      }
      const prev = s.entries[idx] as Extract<AcpEntry, { role: 'tool' }>;
      const next = [...s.entries];
      next[idx] = {
        ...prev,
        title: title ?? prev.title,
        status: status ?? prev.status,
        kind: kind ?? prev.kind,
        content: content ?? prev.content,
        locations: locations ?? prev.locations,
        rawInput: rawInput ?? prev.rawInput,
        rawOutput: rawOutput ?? prev.rawOutput,
      };
      return { entries: next };
    }),

  reset: () => set(cleared),

  restart: () => set((s) => ({ ...cleared, restartNonce: s.restartNonce + 1 })),
}));
