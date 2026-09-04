import { postJson, postNoContent, type TerminalStartResponse } from './shared';

export async function terminalStart(cwd?: string | null, cols?: number, rows?: number) {
  return await postJson<TerminalStartResponse>('/api/terminal/start', {
    cwd,
    cols,
    rows,
  });
}

export async function terminalWrite(sessionId: string, data: string) {
  await postNoContent('/api/terminal/write', { session_id: sessionId, data });
}

export async function terminalResize(sessionId: string, cols: number, rows: number) {
  await postNoContent('/api/terminal/resize', { session_id: sessionId, cols, rows });
}

export async function terminalStop(sessionId: string) {
  await postNoContent('/api/terminal/stop', {
    session_id: sessionId,
  });
}
