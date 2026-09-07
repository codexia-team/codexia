import { BarChart2, ListFilter, Package2, Timer } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentSwitcher } from '@/components/agent';
import { useNewThread, useThreadList } from '@/components/codex/hooks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useLayoutStore } from '@/stores';
import { useAcpStore } from '@/stores/useAcpStore';
import { useAgentSettingsStore } from '@/stores/useAgentSettingsStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { NewAgentButton } from '../common/NewAgentButton';
import { SideBarAddProjectButton } from './SideBarAddProjectButton';
import { SideBarPinnedList } from './SideBarPinnedList';
import { SideBarAcpTab, SideBarClaudeTab, SideBarCodexTab } from './SideBarTab';

const focusCCInput = () => window.dispatchEvent(new Event('cc-input-focus-request'));

// Shared class for nav buttons (Automations / Marketplace)
const navBtnBase = 'justify-start gap-2 rounded-md border px-2.5';
const navBtnActive = 'border-border bg-accent/70 text-accent-foreground';
const navBtnInactive = 'border-transparent hover:border-border/60';
const navBtnCls = (active: boolean) => `${navBtnBase} ${active ? navBtnActive : navBtnInactive}`;

/** The Agent tab's header: the nav actions, pinned projects and agent switcher. */
export function SideBarAgentHeader() {
  const { t } = useTranslation('sidebar');
  const { selectedAgent } = useAgentSettingsStore();
  const { setView, view } = useLayoutStore();
  const { open: isSidebarOpen } = useSidebar();
  const { sortKey, setSortKey } = useThreadList({
    enabled: isSidebarOpen && selectedAgent === 'codex',
  });

  const currentThreadSortLabel = sortKey === 'created_at' ? 'Created' : 'Updated';

  return (
    <>
      {/* Nav actions */}
      <div className="flex flex-col">
        <NewAgentButton showLabel />
        <Button
          variant="ghost"
          size="sm"
          className={navBtnCls(view === 'plugins')}
          onClick={() => setView('plugins')}
        >
          <Package2 className="h-4 w-4" />
          {t('plugins')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={navBtnCls(view === 'automations')}
          onClick={() => setView('automations')}
        >
          <Timer className="h-4 w-4" />
          {t('automations')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={navBtnCls(view === 'insights')}
          onClick={() => setView('insights')}
        >
          <BarChart2 className="h-4 w-4" />
          {t('insights')}
        </Button>

        <SideBarPinnedList />
      </div>

      {/* Tab switcher row */}
      <span className="flex justify-between">
        <AgentSwitcher className="flex gap-2" />

        <span className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={`Filter threads (current: ${currentThreadSortLabel})`}
              >
                <ListFilter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sortKey}
                onValueChange={(v) => setSortKey(v as 'created_at' | 'updated_at')}
              >
                <DropdownMenuRadioItem value="created_at">Sort by Created</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="updated_at">Sort by Updated</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <SideBarAddProjectButton />
        </span>
      </span>
    </>
  );
}

/** The Agent tab's list — `selectedAgent` is the single source of truth. */
export function SideBarAgentList() {
  const { cwd, setCwd } = useWorkspaceStore();
  const { setSelectedAgent, selectedAgent } = useAgentSettingsStore();
  const acpActive = useAcpStore((s) => s.active);
  const { setView, setActiveSidebarTab } = useLayoutStore();
  const { handleNewThread } = useNewThread();
  const { handleNewSession } = useCCSessionManager();

  const handleCreateNewThreadForProject = useCallback(
    (project: string) => {
      if (project !== cwd) setCwd(project);
      void handleNewThread();
    },
    [cwd, handleNewThread, setCwd]
  );

  const handleStartNewAcpSessionForProject = useCallback(
    (directory: string) => {
      setView('agent');
      setCwd(directory);
      // `restart` tears down the connection and asks the composer to reconnect
      // in the new workspace.
      useAcpStore.getState().restart();
    },
    [setCwd, setView]
  );

  const handleStartNewCcSessionForProject = useCallback(
    async (directory: string) => {
      setSelectedAgent('cc');
      setActiveSidebarTab('cc');
      setView('agent');
      setCwd(directory);
      await handleNewSession();
      focusCCInput();
    },
    [handleNewSession, setActiveSidebarTab, setCwd, setSelectedAgent, setView]
  );

  if (acpActive) {
    return <SideBarAcpTab onStartNewSession={handleStartNewAcpSessionForProject} />;
  }
  if (selectedAgent === 'codex') {
    return <SideBarCodexTab onCreateNewThread={handleCreateNewThreadForProject} />;
  }
  return <SideBarClaudeTab onStartNewSession={handleStartNewCcSessionForProject} />;
}
