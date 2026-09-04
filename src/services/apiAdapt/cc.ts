import type { CcAgentOptionsPayload } from '@/types/cc/agentOptions';
import { getJson, postJson, postNoContent } from './shared';

export async function ccNewSession(options: CcAgentOptionsPayload) {
  return await postJson<string>('/api/cc/new-session', { options });
}

export async function ccSendMessage(sessionId: string, message: string, imagePaths: string[] = []) {
  const trimmed = message.trim();
  await postNoContent('/api/cc/send-message', {
    session_id: sessionId,
    message: trimmed,
    image_paths: imagePaths,
  });
}

export async function ccInterrupt(sessionId: string) {
  await postNoContent('/api/cc/interrupt', { session_id: sessionId });
}

export async function ccResumeSession(sessionId: string, options: CcAgentOptionsPayload) {
  await postNoContent('/api/cc/resume-session', {
    session_id: sessionId,
    options,
  });
}

export async function ccGetInstalledSkills() {
  return await getJson<string[]>('/api/cc/installed-skills');
}

export async function ccGetSlashCommands(cwd?: string) {
  const qs = cwd ? `?cwd=${encodeURIComponent(cwd)}` : '';
  return await getJson<string[]>(`/api/cc/slash-commands${qs}`);
}

type CcListSessionsOptions = {
  limit?: number;
  offset?: number;
  includeWorktrees?: boolean;
};

export type CcSessionListResult<T> = { sessions: T[]; total: number };

export async function ccListSessions<T = unknown>(
  directory?: string | null,
  options: CcListSessionsOptions = {}
) {
  const { offset = 0, includeWorktrees = true, limit } = options;

  const params = new URLSearchParams({
    offset: String(offset),
    includeWorktrees: String(includeWorktrees),
  });
  if (directory) {
    params.set('directory', directory);
  }
  if (limit !== undefined) {
    params.set('limit', String(limit));
  }
  return await getJson<CcSessionListResult<T>>(`/api/cc/sessions?${params.toString()}`);
}

export async function ccGetSettings<T = unknown>() {
  return await getJson<T>('/api/cc/settings');
}

export async function ccUpdateSettings(settings: unknown) {
  await postNoContent('/api/cc/settings', { settings });
}

export async function ccMcpAdd(request: unknown, workingDir: string) {
  await postJson('/api/cc/mcp/add', {
    request,
    working_dir: workingDir,
  });
}

export async function ccMcpList<T = unknown>(workingDir: string) {
  return await postJson<T>('/api/cc/mcp/list', {
    working_dir: workingDir,
  });
}

export async function ccMcpGet<T = unknown>(name: string, workingDir: string) {
  return await postJson<T>('/api/cc/mcp/get', {
    name,
    working_dir: workingDir,
  });
}

export async function ccListProjects() {
  return await getJson<string[]>('/api/cc/mcp/projects');
}

export async function ccMcpRemove(name: string, workingDir: string, scope = 'local') {
  await postJson('/api/cc/mcp/remove', {
    name,
    working_dir: workingDir,
    scope,
  });
}

export async function ccMcpEnable(name: string, workingDir: string) {
  await postJson('/api/cc/mcp/enable', {
    name,
    working_dir: workingDir,
  });
}

export async function ccMcpDisable(name: string, workingDir: string) {
  await postJson('/api/cc/mcp/disable', {
    name,
    working_dir: workingDir,
  });
}

export async function ccDeleteSession(sessionId: string): Promise<void> {
  await postNoContent('/api/cc/delete-session', {
    session_id: sessionId,
  });
}

export interface SdkSessionMessage {
  type: 'user' | 'assistant';
  uuid: string;
  session_id: string;
  message?: Record<string, unknown> | null;
  parent_tool_use_id?: string | null;
}

export async function ccGetSessionMessages(sessionId: string): Promise<SdkSessionMessage[]> {
  return await postJson<SdkSessionMessage[]>('/api/cc/session-messages', { session_id: sessionId });
}

export async function ccResolvePermission(requestId: string, decision: string): Promise<void> {
  await postNoContent('/api/cc/resolve-permission', {
    request_id: requestId,
    decision,
  });
}

export async function ccSetPermissionMode(sessionId: string, mode: string) {
  await postNoContent('/api/cc/set-permission-mode', {
    session_id: sessionId,
    mode,
  });
}
