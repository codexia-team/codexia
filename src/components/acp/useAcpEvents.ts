import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { buildEventUrl, isDesktopTauri } from '@/hooks/runtime';
import { useAcpStore } from '@/stores/useAcpStore';
import { applyAcpUpdate } from './applyUpdate';

type AcpEventPayload = {
  connectionId: string;
  agentId: string;
  kind: 'update' | 'permission' | 'stderr' | 'exited' | 'notification';
  /** Set on `update` and `permission`: which session on the connection it came from. */
  sessionId?: string;
  update?: Record<string, unknown>;
  requestId?: string;
  toolCall?: Record<string, unknown>;
  options?: Array<{ optionId: string; name: string; kind?: string }>;
  line?: string;
};

/**
 * Bridges backend `acp-message` events (Tauri event / SSE) into the ACP store.
 * Mirrors the CC listener: Tauri events on desktop, `/api/events` SSE elsewhere.
 */
export function useAcpEvents(connectionId: string | null) {
  useEffect(() => {
    if (!connectionId) return;

    const handle = (payload: AcpEventPayload) => {
      if (payload.connectionId !== connectionId) return;
      const store = useAcpStore.getState();
      // One process can host several sessions — drop the ones this pane is not
      // showing. Read the open session from the store rather than closing over
      // it: `session/load` replays its transcript the moment the pane switches,
      // before a re-render could resubscribe with the new id. Connection-wide
      // events (`exited`, `stderr`) carry no session and always pass.
      if (payload.sessionId && store.sessionId && payload.sessionId !== store.sessionId) return;

      if (payload.kind === 'exited') {
        store.addEntry({ id: `exit-${Date.now()}`, role: 'error', text: 'Agent process exited.' });
        store.setRunning(false);
        return;
      }

      // Some agents report login links (device-flow OAuth) on stderr or as a
      // bare notification rather than in the `authenticate` response, which
      // carries nothing back. Only worth surfacing while a sign-in is pending.
      if (payload.kind === 'stderr' && store.authenticating && payload.line) {
        store.appendAuthNotice(payload.line);
        return;
      }
      if (payload.kind === 'notification' && store.authenticating) {
        const text = JSON.stringify(payload).match(/https?:\/\/\S+/)?.[0];
        if (text) store.appendAuthNotice(text);
        return;
      }

      if (payload.kind === 'permission') {
        const title = (payload.toolCall?.title as string) ?? 'Permission requested';
        store.setPermission({
          requestId: payload.requestId!,
          title,
          options: payload.options ?? [],
        });
        return;
      }

      if (payload.kind !== 'update' || !payload.update) return;

      applyAcpUpdate(payload.update as Record<string, any>);
    };

    if (isDesktopTauri()) {
      const unlisten = listen<AcpEventPayload>('acp-message', (e) => handle(e.payload));
      return () => {
        void unlisten.then((fn) => fn());
      };
    }

    const es = new EventSource(buildEventUrl('/api/events'));
    es.onmessage = (e) => {
      try {
        const envelope = JSON.parse(e.data as string) as { event?: string; payload?: unknown };
        if (envelope.event === 'acp-message') handle(envelope.payload as AcpEventPayload);
      } catch {}
    };
    return () => es.close();
  }, [connectionId]);
}
