import { Bot, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useAcpAgents } from '@/components/acp/useAcpAgents';
import { AgentIcon } from '@/components/common/AgentIcon';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { acpStop } from '@/services/apiAdapt/acp';
import { useLayoutStore } from '@/stores';
import { useAcpStore } from '@/stores/useAcpStore';
import { useAgentSettingsStore } from '@/stores/useAgentSettingsStore';

const BUILTIN = [
  { id: 'codex', name: 'Codex' },
  { id: 'cc', name: 'Claude Code' },
] as const;

/**
 * Picks which agent drives the chat pane: the two built-in agents plus every
 * agent reachable over ACP. A single trigger rather than a row of tabs — the
 * ACP preset list grows, and this row also carries the session list.
 */
export function AgentSelector() {
  const { selectedAgent, setSelectedAgent } = useAgentSettingsStore();
  const { setActiveSidebarTab } = useLayoutStore();
  const { active, agentId, connectionId, setActive, setAgentId, reset } = useAcpStore();
  const acpAgents = useAcpAgents() ?? [];
  const [open, setOpen] = useState(false);

  const current = active
    ? (acpAgents.find((a) => a.id === agentId)?.name ?? agentId)
    : (BUILTIN.find((b) => b.id === selectedAgent)?.name ?? selectedAgent);

  const selectBuiltin = (agent: 'codex' | 'cc') => {
    setSelectedAgent(agent);
    setActiveSidebarTab(agent);
    // Leave the ACP connection running so switching back keeps the transcript.
    setActive(false);
    setOpen(false);
  };

  const selectAcp = async (id: string) => {
    setOpen(false);
    if (active && agentId === id) return;
    if (connectionId && agentId !== id) {
      await acpStop(connectionId);
      reset();
    }
    setAgentId(id);
    setActive(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs font-medium">
          {active ? <Bot className="h-4 w-4" /> : <AgentIcon agent={selectedAgent} />}
          <span className="truncate max-w-32">{current}</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search agents..." className="h-8" />
          <CommandList>
            <CommandEmpty>No agent found.</CommandEmpty>
            <CommandGroup heading="Built-in">
              {BUILTIN.map((b) => (
                <CommandItem key={b.id} value={b.name} onSelect={() => selectBuiltin(b.id)}>
                  <AgentIcon agent={b.id} />
                  <span className="ml-2 flex-1">{b.name}</span>
                  {!active && selectedAgent === b.id && <Check className="h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="ACP">
              {acpAgents.map((a) => (
                <CommandItem key={a.id} value={a.name} onSelect={() => selectAcp(a.id)}>
                  <Bot className={`h-4 w-4 ${a.available ? '' : 'opacity-50'}`} />
                  <div className="ml-2 flex-1 min-w-0">
                    <div className={a.available ? '' : 'opacity-50'}>{a.name}</div>
                    <div className="truncate text-[10px] font-mono text-muted-foreground">
                      {[a.command, ...a.args].join(' ')}
                    </div>
                  </div>
                  {!a.available && (
                    <span className="text-[10px] text-muted-foreground">not installed</span>
                  )}
                  {active && agentId === a.id && <Check className="ml-1 h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
