import { useEffect, useRef } from 'react';
import type { ServerNotification } from '@/bindings/ServerNotification';
import type {
  ApprovalRequest,
  ElicitationRequest,
  PermissionsRequest,
  RequestUserInputRequest,
} from '@/components/codex/stores';
import { isDesktopTauri } from '@/hooks/runtime';
import { openEventStream } from '@/lib/eventStream';

interface SseEventHandlers {
  enabled: boolean;
  onApproval: (payload: ApprovalRequest) => void;
  onUserInputRequest: (payload: RequestUserInputRequest) => void;
  onElicitationRequest: (payload: ElicitationRequest) => void;
  onPermissionsRequest: (payload: PermissionsRequest) => void;
  onNotification: (payload: ServerNotification) => void;
}

// Bridges server-sent events into the same handler shape as the Tauri native
// event listeners.
//
// The desktop keeps its agent events on the Tauri bus, but the filesystem
// watcher lives in the web server on every platform now, so `fs_change` only
// ever arrives here — desktop included.
export function useSseEventBridge({
  enabled,
  onApproval,
  onUserInputRequest,
  onElicitationRequest,
  onPermissionsRequest,
  onNotification,
}: SseEventHandlers) {
  // Handlers are read through a ref so the effect below depends only on
  // `enabled`. Re-running it on every render would tear down and reopen the
  // event stream, dropping events during the reconnect.
  const handlersRef = useRef({
    onApproval,
    onUserInputRequest,
    onElicitationRequest,
    onPermissionsRequest,
    onNotification,
  });
  handlersRef.current = {
    onApproval,
    onUserInputRequest,
    onElicitationRequest,
    onPermissionsRequest,
    onNotification,
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('[useSseEventBridge] Setting up SSE event bridge...');

    // Reconnects carry a `?since=` cursor so events emitted while disconnected
    // are replayed rather than lost. See openEventStream.
    return openEventStream({
      label: '[useSseEventBridge]',
      onEvent: (envelope) => {
        if (!envelope.event) return;

        if (envelope.event === 'fs_change') {
          window.dispatchEvent(new CustomEvent('fs_change', { detail: envelope.payload }));
          return;
        }
        // Everything below reaches the desktop over the Tauri bus already;
        // handling it here too would deliver it twice.
        if (isDesktopTauri()) return;
        if (envelope.event === 'codex/approval-request') {
          handlersRef.current.onApproval(envelope.payload as ApprovalRequest);
          return;
        }
        if (envelope.event === 'codex/request-user-input') {
          handlersRef.current.onUserInputRequest(envelope.payload as RequestUserInputRequest);
          return;
        }
        if (envelope.event === 'codex/elicitation-request') {
          handlersRef.current.onElicitationRequest(envelope.payload as ElicitationRequest);
          return;
        }
        if (envelope.event === 'codex/permissions-request') {
          handlersRef.current.onPermissionsRequest(envelope.payload as PermissionsRequest);
          return;
        }
        if (envelope.event === 'codex:notification') {
          handlersRef.current.onNotification(envelope.payload as ServerNotification);
        }
      },
    });
  }, [enabled]);
}
