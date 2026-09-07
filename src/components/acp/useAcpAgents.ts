import { useEffect, useState } from 'react';
import { type AcpAgentDef, acpListAgents } from '@/services/apiAdapt/acp';

let cache: AcpAgentDef[] | null = null;
let inflight: Promise<AcpAgentDef[]> | null = null;
const listeners = new Set<(agents: AcpAgentDef[]) => void>();

/**
 * The resolved agent presets, or `null` while the first resolve is still in
 * flight. `null` is deliberately distinct from `[]`: a caller must be able to
 * tell "not known yet" from "nothing is installed", otherwise it renders an
 * install prompt for an agent that is in fact present.
 */
export function useAcpAgents(): AcpAgentDef[] | null {
  const [agents, setAgents] = useState<AcpAgentDef[] | null>(cache);

  useEffect(() => {
    listeners.add(setAgents);
    if (!cache) loadAcpAgents().then(setAgents);
    return () => {
      listeners.delete(setAgents);
    };
  }, []);

  return agents;
}

/**
 * The resolved list, awaited rather than read from React state. A component
 * event handler (a message send, say) can fire before the hook's own effect
 * has resolved its first render — awaiting this instead of trusting the
 * hook's return value avoids treating "not loaded yet" as "not installed".
 */
export function loadAcpAgents(): Promise<AcpAgentDef[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= acpListAgents().catch(() => []);
  return inflight.then((list) => {
    cache = list;
    return list;
  });
}

/**
 * Resolve the presets again from scratch. Availability is a PATH lookup made
 * once per app run, so installing an agent while the app is open would
 * otherwise keep reading as missing until a restart.
 */
export async function refreshAcpAgents(): Promise<AcpAgentDef[]> {
  cache = null;
  inflight = null;
  const list = await loadAcpAgents();
  for (const listener of listeners) listener(list);
  return list;
}
