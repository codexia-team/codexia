/**
 * Persistent settings backed by ~/.codexia/settings.json
 *
 * Usage:
 *   - Call loadSettings() before rendering the app (hydrates all stores from file)
 *   - Call initSettingsSync() once to subscribe stores → debounced file write
 *   - Both are called in App.tsx AppShell
 */

import { getHomeDirectory, readTextFile, writeFile } from '@/services/apiAdapt';
import { fetchRemoteSettings } from '@/services/apiAdapt/settings';
import { useAgentSettingsStore } from '@/stores/useAgentSettingsStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

const SETTINGS_FILE = '/.codexia/settings.json';
const SETTINGS_VERSION = 1;

// ── Types ────────────────────────────────────────────────────────────────────

type WorkspaceData = {
  projects: string[];
  historyProjects: string[];
  selectedAgent: string;
  cwd: string | undefined;
  projectSort: string;
  instructionType: string;
};

interface SettingsFile {
  version?: number;
  workspace?: Partial<WorkspaceData>;
  /** Keys owned by the backend (e.g. `remote`) are carried through untouched. */
  [key: string]: unknown;
}

// ── File I/O ─────────────────────────────────────────────────────────────────

let filePath: string | null = null;

async function getFilePath(): Promise<string> {
  if (!filePath) {
    filePath = (await getHomeDirectory()) + SETTINGS_FILE;
  }
  return filePath;
}

async function readSettingsFile(): Promise<SettingsFile | null> {
  try {
    const path = await getFilePath();
    const raw = await readTextFile(path, { suppressToast: true });
    return JSON.parse(raw) as SettingsFile;
  } catch {
    return null;
  }
}

// ── Hydration ─────────────────────────────────────────────────────────────────

function applySettings(data: SettingsFile): void {
  if (data.workspace) {
    const ws = data.workspace;
    useWorkspaceStore.setState({
      ...(ws.projects !== undefined && { projects: ws.projects }),
      ...(ws.historyProjects !== undefined && { historyProjects: ws.historyProjects }),
      ...(ws.cwd !== undefined && { cwd: ws.cwd }),
      ...(ws.projectSort !== undefined && { projectSort: ws.projectSort as never }),
    });
    useAgentSettingsStore.setState({
      ...(ws.selectedAgent !== undefined && { selectedAgent: ws.selectedAgent as never }),
      ...(ws.instructionType !== undefined && { instructionType: ws.instructionType }),
    });
  }
}

export async function loadSettings(): Promise<void> {
  const data = await readSettingsFile();
  if (!data) return;
  applySettings(data);
}

/** Why the last remote load produced no projects, for the phone to show. */
let lastRemoteError: string | null = null;
export const remoteSettingsError = (): string | null => lastRemoteError;

/**
 * Load settings from the connected desktop via its API. Used on iOS.
 *
 * Returns false when the desktop answered with nothing usable, so the caller
 * can fall back to reading the file over the remote filesystem API instead.
 */
export async function loadRemoteSettings(): Promise<boolean> {
  try {
    const data = (await fetchRemoteSettings()) as SettingsFile;
    lastRemoteError = data.workspace ? null : 'The desktop returned no workspace settings.';
    if (!data.workspace) return false;
    applySettings(data);
    return true;
  } catch (err) {
    lastRemoteError = String(err);
    console.error('[settings] loadRemoteSettings failed:', err);
    return false;
  }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

function snapshot(): SettingsFile {
  const ws = useWorkspaceStore.getState();
  const as = useAgentSettingsStore.getState();

  return {
    version: SETTINGS_VERSION,
    workspace: {
      projects: ws.projects,
      historyProjects: ws.historyProjects,
      selectedAgent: as.selectedAgent,
      cwd: ws.cwd ?? undefined,
      projectSort: ws.projectSort,
      instructionType: as.instructionType,
    },
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

let writeTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWrite(): void {
  if (writeTimer !== null) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    writeTimer = null;
    try {
      const path = await getFilePath();
      // Merge rather than replace: the backend keeps its own keys in this file
      // (`remote.enabled`), and a blind overwrite would drop them.
      const existing = (await readSettingsFile()) ?? {};
      await writeFile(path, JSON.stringify({ ...existing, ...snapshot() }, null, 2));
    } catch (err) {
      console.error('[settings] write failed:', err);
    }
  }, 300);
}

// ── Sync ──────────────────────────────────────────────────────────────────────

/** Subscribe all tracked stores. Returns an unsubscribe function. */
export function initSettingsSync(): () => void {
  const unsubs = [
    useWorkspaceStore.subscribe(scheduleWrite),
    useAgentSettingsStore.subscribe(scheduleWrite),
  ];
  return () => {
    for (const fn of unsubs) fn();
  };
}
