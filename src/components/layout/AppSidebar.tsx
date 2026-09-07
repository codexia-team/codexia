import { Bug, Monitor, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SideBarBotPane } from '@/components/bot';
import { DesktopDrawer } from '@/components/pairing/DesktopDrawer';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTrafficLightConfig } from '@/hooks';
import { isPhone } from '@/hooks/runtime';
import { type SidebarMode, useLayoutStore } from '@/stores';
import { UpdateIndicator } from '../../features/UpdateIndicator';
import { SessionManagerDialog } from '../common/SessionManagerDialog';
import { SideBarAgentHeader, SideBarAgentList } from './SideBarAgentPane';
import { UserInfo } from './UserInfo';

export function AppSideBar() {
  const { t } = useTranslation('sidebar');
  const modes: Array<{ id: SidebarMode; label: string }> = [
    { id: 'agent', label: t('agent') },
    { id: 'bot', label: t('bot') },
  ];
  const {
    view,
    setView,
    activeSidebarTab,
    sidebarMode,
    setSidebarMode,
    hasSeenBotTab,
    setHasSeenBotTab,
  } = useLayoutStore();
  const { open: isSidebarOpen } = useSidebar();
  const { isMacos } = useTrafficLightConfig(isSidebarOpen);
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);
  // Only a phone drives a remote machine; a desktop is its own backend and has
  // nothing to switch between.
  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(false);

  const selectMode = (mode: SidebarMode) => {
    setSidebarMode(mode);
    // The Bot tab is a conversation, not a workspace: switching to it leaves
    // the agent views behind rather than showing an empty one beside them.
    if (mode === 'bot') {
      setView('bot');
      setHasSeenBotTab(true);
    } else if (view === 'bot') {
      setView('agent');
    }
  };

  return (
    <>
      <Sidebar className="border-r border-sidebar-border bg-zinc-100/95 dark:bg-zinc-900/95">
        <SidebarHeader className="gap-1 p-1">
          {/* Header row: toggle */}
          <div
            className={`flex items-center gap-2 ${isMacos ? 'pl-20' : 'pl-2'}`}
            data-tauri-drag-region
          >
            <SidebarTrigger className="h-7 w-7" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Manage sessions & threads"
              onClick={() => setSessionManagerOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            {isPhone() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Desktops"
                onClick={() => setDesktopDrawerOpen(true)}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Agent / Bot */}
          <div className="flex items-center gap-1 rounded-md bg-muted/50 p-0.5">
            {modes.map((mode) => (
              <button
                type="button"
                key={mode.id}
                onClick={() => selectMode(mode.id)}
                className={`relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors ${
                  sidebarMode === mode.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{mode.label}</span>
                {mode.id === 'bot' && !hasSeenBotTab && sidebarMode !== 'bot' && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {sidebarMode === 'agent' && <SideBarAgentHeader />}
        </SidebarHeader>

        <SidebarContent className="min-w-0 max-w-full overflow-x-hidden gap-0 px-0">
          {sidebarMode === 'agent' ? <SideBarAgentList /> : <SideBarBotPane />}
        </SidebarContent>

        <SidebarFooter className="flex-row items-center p-0 min-w-0 max-w-full overflow-x-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <UserInfo />
          </div>
          <div className="flex-shrink-0 pr-2 flex items-center gap-2">
            <UpdateIndicator
              fallback={
                <a
                  href="https://github.com/milisp/codexia/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bug className="h-4 w-4" />
                </a>
              }
            />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SessionManagerDialog
        open={sessionManagerOpen}
        onOpenChange={setSessionManagerOpen}
        defaultTab={activeSidebarTab === 'cc' ? 'cc' : 'codex'}
      />

      {isPhone() && <DesktopDrawer open={desktopDrawerOpen} onOpenChange={setDesktopDrawerOpen} />}
    </>
  );
}
