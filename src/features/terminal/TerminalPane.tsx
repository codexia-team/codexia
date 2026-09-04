import { useCallback, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { buildWsUrl } from '@/hooks/runtime';
import { terminalResize, terminalStart, terminalStop, terminalWrite } from '@/services/apiAdapt';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

const TERMINAL_THEME = {
  fontFamily: 'Menlo, Monaco, Consolas, monospace',
  fontSize: 12,
  background: '#0a0a0a',
} as const;

type TerminalDataPayload = { session_id: string; data: string };
type TerminalExitPayload = { session_id: string; message: string };

// xterm@5.x's Viewport schedules an internal setTimeout/rAF chain inside
// open() (Viewport -> _refresh -> _innerRefresh -> RenderService.dimensions).
// term.dispose() does not cancel that pending timer, so if a pane is
// unmounted (tab closed/switched quickly) before it fires, the callback
// runs against an already-disposed RenderService and throws
// "undefined is not an object (evaluating 'this._renderer.value.dimensions')"
// as an uncaught error outside our call stack — it cannot be caught with a
// normal try/catch around fit()/open(). Suppress just this known, benign
// error globally so it doesn't crash the app or show the dev error overlay.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('_renderer.value.dimensions')) {
      event.preventDefault();
    }
  });
}

interface TerminalPaneProps {
  active: boolean;
  panelOpen: boolean;
}

export function TerminalPane({ active, panelOpen }: TerminalPaneProps) {
  const { cwd } = useWorkspaceStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStartingRef = useRef(false);
  const isAttachedRef = useRef(false);

  const setSession = useCallback((sid: string | null) => {
    sessionIdRef.current = sid;
  }, []);

  // Create Terminal instance once per pane
  useEffect(() => {
    const term = new Terminal({
      convertEol: false,
      cursorBlink: true,
      fontFamily: TERMINAL_THEME.fontFamily,
      fontSize: TERMINAL_THEME.fontSize,
      scrollback: 5000,
      theme: { background: TERMINAL_THEME.background },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const disposeData = term.onData((data) => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      void terminalWrite(sid, data).catch((err) => {
        term.writeln(`\r\n[write failed] ${String(err)}`);
      });
    });

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      disposeData.dispose();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      isAttachedRef.current = false;
    };
  }, []);

  // Attach xterm to DOM on first activation; re-fit on subsequent activations
  useEffect(() => {
    if (!active || !panelOpen) return;
    const term = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    const container = containerRef.current;
    if (!term || !fitAddon || !container) return;

    if (!isAttachedRef.current) {
      term.open(container);
      isAttachedRef.current = true;
    }

    requestAnimationFrame(() => {
      // Fitting a collapsed container shrinks the buffer to its minimum and
      // loses the rendered output, so only fit once it has real size.
      if (container.clientWidth > 1 && container.clientHeight > 1) fitAddon.fit();
      term.focus();
    });
  }, [active, panelOpen]);

  // Start backend session once attached
  const startSession = useCallback(async () => {
    const term = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    // Allow both desktop Tauri and web (HTTP API) mode —
    // service layer routes to invokeTauri or postJson accordingly.
    if (!term || !fitAddon || sessionIdRef.current || isStartingRef.current) return;

    isStartingRef.current = true;
    try {
      const { session_id } = await terminalStart(
        cwd,
        Math.max(term.cols, 2),
        Math.max(term.rows, 2)
      );
      setSession(session_id);
    } catch (err) {
      terminalRef.current?.writeln(`\r\n[session start failed] ${String(err)}`);
    } finally {
      isStartingRef.current = false;
    }
  }, [cwd, setSession]);

  useEffect(() => {
    if (!active || !panelOpen) return;
    void startSession();
  }, [active, panelOpen, startSession]);

  // Shared handlers for terminal data/exit events, used by both
  // the Tauri event listener and the web WebSocket listener below.
  const handleTerminalData = useCallback((payload: TerminalDataPayload) => {
    if (payload.session_id !== sessionIdRef.current) return;
    terminalRef.current?.write(payload.data);
  }, []);

  const handleTerminalExit = useCallback(
    (payload: TerminalExitPayload) => {
      if (payload.session_id !== sessionIdRef.current) return;
      terminalRef.current?.writeln(`\r\n[${payload.message}]`);
      setSession(null);
    },
    [setSession]
  );

  // The pty lives in the web server on every platform — the desktop reaches
  // its own loopback instance, a phone reaches the paired desktop — so output
  // always arrives over the WebSocket rather than the Tauri event bus.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    const connect = () => {
      ws = new WebSocket(buildWsUrl('/ws'));

      ws.onmessage = (messageEvent) => {
        try {
          const envelope = JSON.parse(messageEvent.data as string) as {
            event?: string;
            payload?: unknown;
          };

          if (envelope.event === 'terminal:data' && envelope.payload) {
            handleTerminalData(envelope.payload as TerminalDataPayload);
          } else if (envelope.event === 'terminal:exit' && envelope.payload) {
            handleTerminalExit(envelope.payload as TerminalExitPayload);
          }
        } catch (error) {
          console.warn('[TerminalPane] Failed to parse websocket message:', error);
        }
      };

      ws.onclose = () => {
        if (closedByCleanup) return;
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [handleTerminalData, handleTerminalExit]);

  // Resize — only when this pane is active and visible
  useEffect(() => {
    const fitAndResize = () => {
      if (!active || !panelOpen) return;
      const term = terminalRef.current;
      const fitAddon = fitAddonRef.current;
      const container = containerRef.current;
      if (!term || !fitAddon || !container) return;
      if (container.clientWidth < 2 || container.clientHeight < 2) return;
      fitAddon.fit();
      const sid = sessionIdRef.current;
      if (sid) {
        void terminalResize(sid, Math.max(term.cols, 2), Math.max(term.rows, 2));
      }
    };

    const observer = new ResizeObserver(fitAndResize);
    if (active && panelOpen && containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [active, panelOpen]);

  // Stop session on pane unmount
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) void terminalStop(sid);
    };
  }, []);

  return (
    <div className="absolute inset-0" style={{ visibility: active ? 'visible' : 'hidden' }}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Terminal"
        className="h-full w-full px-2 py-2"
        onMouseDown={() => terminalRef.current?.focus()}
      />
    </div>
  );
}
