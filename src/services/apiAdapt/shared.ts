import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/components/ui/use-toast';
import { authHeaders, buildUrl, isDesktopTauri, isTauri } from '@/hooks/runtime';

export type MarketplaceSkillItem = {
  name: string;
  description?: string | null;
  license?: string | null;
  skillMdPath: string;
  sourceDirPath: string;
  installed: boolean;
};

export type InstalledSkillItem = {
  name: string;
  path: string;
  skillMdPath?: string | null;
  description?: string | null;
};

export type SkillScope = 'user' | 'project';
export type SkillAgent = 'codex' | 'cc';
export type UnifiedMcpClientName = 'codex' | 'cc';

export type UnifiedMcpConfig = {
  mcpServers?: Record<string, unknown>;
};

export type TauriFileEntry = {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  extension: string | null;
};

export type TerminalStartResponse = {
  session_id: string;
  shell: string;
};

async function extractErrorMessage(response: Response) {
  try {
    const payload = (await response.clone().json()) as { error?: string };
    if (payload?.error) {
      return payload.error;
    }
  } catch {}
  return `Request failed: ${response.status}`;
}

export async function invokeTauri<T>(
  command: string,
  payload?: Record<string, unknown>
): Promise<T> {
  return invoke<T>(command, payload);
}

// Tauri errors arrive as plain strings, often wrapping a JSON-RPC error such as
// `Request failed: {"code":-32600,"message":"..."}`. Show the inner message.
function formatInvokeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const start = raw.indexOf('{');
  if (start !== -1) {
    try {
      const payload = JSON.parse(raw.slice(start)) as { message?: string };
      if (payload?.message) return payload.message;
    } catch {}
  }
  return raw;
}

// Same as `invokeTauri`, but surfaces failures as a toast like the web path does.
async function invokeTauriWithToast<T>(
  command: string,
  payload: Record<string, unknown> | undefined,
  options?: { suppressToast?: boolean }
): Promise<T> {
  try {
    return await invoke<T>(command, payload);
  } catch (error) {
    const message = formatInvokeError(error);
    if (!options?.suppressToast) {
      toast({
        title: 'Request failed',
        description: message,
        variant: 'destructive',
        id: message,
      });
    }
    throw new Error(message);
  }
}

export async function getJson<T>(path: string): Promise<T> {
  return getJsonWithOptions<T>(path);
}

export async function getJsonWithOptions<T>(
  path: string,
  options?: { suppressToast?: boolean }
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (!options?.suppressToast) {
      toast({
        title: 'Request failed',
        description: message,
        variant: 'destructive',
        id: message,
      });
    }
    return Promise.reject(new Error(message));
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return postJsonWithOptions<T>(path, body);
}

export async function postJsonWithOptions<T>(
  path: string,
  body?: unknown,
  options?: { suppressToast?: boolean }
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (!options?.suppressToast) {
      toast({
        title: 'Request failed',
        description: message,
        variant: 'destructive',
        id: message,
      });
    }
    return Promise.reject(new Error(message));
  }

  return (await response.json()) as T;
}

export async function postNoContent(path: string, body?: unknown): Promise<void> {
  return postNoContentWithOptions(path, body);
}

export async function postNoContentWithOptions(
  path: string,
  body?: unknown,
  options?: { suppressToast?: boolean }
): Promise<void> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (!options?.suppressToast) {
      toast({
        title: 'Request failed',
        description: message,
        variant: 'destructive',
        id: message,
      });
    }
    return Promise.reject(new Error(message));
  }
}

export async function dual<T>(
  command: string,
  tauriArgs: Record<string, unknown> | undefined,
  path: string,
  body?: unknown,
  options?: { suppressToast?: boolean }
): Promise<T> {
  if (isDesktopTauri()) {
    return await invokeTauriWithToast<T>(command, tauriArgs, options);
  }
  return await postJsonWithOptions<T>(path, body, options);
}

export async function dualGet<T>(
  command: string,
  tauriArgs: Record<string, unknown> | undefined,
  path: string,
  options?: { suppressToast?: boolean }
): Promise<T> {
  if (isDesktopTauri()) {
    return await invokeTauriWithToast<T>(command, tauriArgs, options);
  }
  return await getJsonWithOptions<T>(path, options);
}

export async function dualVoid(
  command: string,
  tauriArgs: Record<string, unknown> | undefined,
  path: string,
  body?: unknown
): Promise<void> {
  if (isDesktopTauri()) {
    await invokeTauriWithToast(command, tauriArgs);
    return;
  }
  await postNoContent(path, body);
}

export { isDesktopTauri, isTauri, toast };
