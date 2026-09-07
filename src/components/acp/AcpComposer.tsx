import { ArrowUp, Download, Loader2, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { acpCancel, acpPrompt, acpStart } from '@/services/apiAdapt/acp';
import { useWorkspaceStore } from '@/stores';
import { useAcpStore } from '@/stores/useAcpStore';
import { AcpModelMenu } from './AcpModelMenu';
import { AcpSessionControls } from './AcpSessionControls';
import { useAcpAgents } from './useAcpAgents';

export function AcpComposer() {
  const {
    agentId,
    connectionId,
    sessionId,
    connecting,
    running,
    setConnecting,
    setConnection,
    applySession,
    setRunning,
    addEntry,
    restartNonce,
  } = useAcpStore();
  const cwd = useWorkspaceStore((s) => s.cwd);
  const agents = useAcpAgents() ?? [];
  const [text, setText] = useState('');
  // Agent we already tried to auto-connect, so a failed start does not spin in
  // a retry loop. Cleared on an explicit restart.
  const attempted = useRef<string | null>(null);
  const seenRestart = useRef(restartNonce);

  const agent = agents.find((a) => a.id === agentId);
  const commandLine = agent ? [agent.command, ...agent.args].join(' ') : '';

  /** Start the agent and open a session. Returns the live ids, or null on failure. */
  const connect = useCallback(async () => {
    if (!cwd) {
      toast({ title: 'Pick a workspace folder first', variant: 'destructive' });
      return null;
    }
    attempted.current = agentId;
    setConnecting(true);
    try {
      const res = await acpStart(agentId, cwd);
      setConnection({
        connectionId: res.connectionId,
        sessionId: res.sessionId,
        agentTitle: res.initialize.agentInfo?.title ?? res.initialize.agentInfo?.name ?? agentId,
        authMethods: res.initialize.authMethods ?? [],
        canLoadSession: res.initialize.agentCapabilities?.loadSession === true,
      });
      applySession(res.session);
      if (res.sessionError) {
        addEntry({ id: `start-${Date.now()}`, role: 'error', text: res.sessionError });
        return null;
      }
      return res.sessionId ? { connectionId: res.connectionId, sessionId: res.sessionId } : null;
    } catch (e) {
      setConnecting(false);
      toast({ title: 'Failed to start agent', description: String(e), variant: 'destructive' });
      return null;
    }
  }, [agentId, cwd, setConnecting, setConnection, applySession, addEntry]);

  // Connect as soon as an installed agent is picked, so its model / mode
  // controls are available before the first prompt.
  useEffect(() => {
    if (seenRestart.current !== restartNonce) {
      seenRestart.current = restartNonce;
      attempted.current = null;
    }
    if (connectionId || connecting || !cwd || !agent?.available) return;
    if (attempted.current === agentId) return;
    void connect();
  }, [agentId, cwd, connectionId, connecting, agent?.available, restartNonce, connect]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || running || connecting) return;

    let live = connectionId && sessionId ? { connectionId, sessionId } : null;
    if (!live) {
      if (agent && !agent.available) {
        toast({ title: `${agent.name} is not installed`, description: `Download it first.` });
        return;
      }
      live = await connect();
      if (!live) return;
    }

    setText('');
    addEntry({ id: `u-${Date.now()}`, role: 'user', text: trimmed });
    setRunning(true);
    try {
      await acpPrompt(live.connectionId, live.sessionId, trimmed);
    } catch (e) {
      addEntry({ id: `e-${Date.now()}`, role: 'error', text: String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="px-3 pt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Do anything..."
          rows={2}
          className="w-full min-h-[44px] resize-none bg-transparent text-base md:text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Uninstalled agents run through an npx download — never do that implicitly. */}
      {agent && !agent.available && !connectionId && (
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/30 text-xs">
          <span className="min-w-0 flex-1 text-muted-foreground">
            {agent.name} is not installed — starting it downloads{' '}
            <span className="font-mono">{commandLine}</span>
          </span>
          <Button size="sm" className="h-6 gap-1" disabled={connecting} onClick={() => connect()}>
            <Download className="h-3 w-3" />
            Download &amp; run
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-1 py-1 bg-muted/20 border-t">
        <div className="flex items-center gap-1 min-w-0">
          <AcpSessionControls />
          {connecting && (
            <span className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Starting {agent?.name ?? 'agent'}...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AcpModelMenu />
          {running ? (
            <Button
              onClick={() => connectionId && acpCancel(connectionId, sessionId)}
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => send()}
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={connecting || !text.trim()}
              title="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
