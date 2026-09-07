import { lazy, Suspense, useEffect, useRef } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { AppSideBar, RightPanel } from '@/components/layout';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';
import { useLayoutStore } from '@/stores';

const SettingsView = lazy(() => import('@/components/settings/SettingsView'));
const PluginsView = lazy(() => import('@/features/plugins/components/PluginsView'));
const AgentsMdView = lazy(() => import('@/views/AgentsMdView'));
const AgentView = lazy(() => import('@/components/agent/AgentView'));
const AutoMationsView = lazy(() =>
  import('../../features/automations').then((module) => ({ default: module.AutoMationsView }))
);
const InsightsView = lazy(() => import('@/features/insight/InsightsView'));
const BotChatView = lazy(() => import('@/components/bot/BotChatView'));

// Inner component so it can call useSidebar() inside SidebarProvider
const MIN_RIGHT_PANEL_SIZE = 22;
const MAX_RIGHT_PANEL_SIZE = 75;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function LayoutContent({ mainContent }: { mainContent: React.ReactNode }) {
  const {
    isSidebarOpen,
    setSidebarOpen,
    isRightPanelOpen,
    setRightPanelOpen,
    rightPanelSize,
    setRightPanelSize,
    view,
    isRightPanelFocused,
  } = useLayoutStore();
  // Right panel (diff/tasks/notes/files/preview) only makes sense alongside the
  // agent thread — other views (history, automations, settings, ...) hide it.
  const canShowRightPanel = view === 'agent';
  const isRightPanelVisible = canShowRightPanel && isRightPanelOpen;
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const mainPanelRef = useRef<ImperativePanelHandle>(null);
  const isMobile = useIsMobile();
  // Focus mode hides the main agent thread so the right panel (diff/tasks/etc.)
  // can take the full width — useful when reviewing a diff or reading notes
  // without the agent chat competing for attention.
  const isFocusModeActive =
    canShowRightPanel && isRightPanelVisible && isRightPanelFocused && !isMobile;
  const hasInitializedMobileLayoutRef = useRef(false);
  const { setOpenMobile } = useSidebar();

  useEdgeSwipe({ onSwipeRight: () => setOpenMobile(true), enabled: isMobile });

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (isMobile) {
      panel.collapse();
      return;
    }
    if (isFocusModeActive) {
      panel.expand();
      return;
    }
    if (isRightPanelVisible) {
      const nextSize = clamp(rightPanelSize, MIN_RIGHT_PANEL_SIZE, MAX_RIGHT_PANEL_SIZE);
      panel.resize(nextSize);
      panel.expand();
      if (nextSize !== rightPanelSize) setRightPanelSize(nextSize);
    } else {
      panel.collapse();
    }
  }, [isFocusModeActive, isMobile, isRightPanelVisible, rightPanelSize, setRightPanelSize]);

  useEffect(() => {
    if (!isMobile) {
      hasInitializedMobileLayoutRef.current = false;
      return;
    }
    if (hasInitializedMobileLayoutRef.current) return;
    hasInitializedMobileLayoutRef.current = true;
    if (isSidebarOpen) setSidebarOpen(false);
    if (isRightPanelOpen) setRightPanelOpen(false);
  }, [isMobile, isRightPanelOpen, isSidebarOpen, setRightPanelOpen, setSidebarOpen]);

  const handleRightPanelResize = (size: number) => {
    if (!isRightPanelVisible || isFocusModeActive || size <= 0) return;
    const nextSize = clamp(size, MIN_RIGHT_PANEL_SIZE, MAX_RIGHT_PANEL_SIZE);
    if (nextSize !== rightPanelSize) setRightPanelSize(nextSize);
  };

  // Focus mode collapses the main panel instead of swapping the tree, so the
  // right panel (and long-lived children like the terminal) stays mounted.
  useEffect(() => {
    const panel = mainPanelRef.current;
    if (!panel) return;
    if (isFocusModeActive) panel.collapse();
    else panel.expand();
  }, [isFocusModeActive]);

  return (
    <SidebarInset className="app-main-bg min-w-0 overflow-hidden h-full">
      <div className="relative flex flex-1 flex-col min-h-0 h-full">
        <ResizablePanelGroup direction="horizontal" className="flex min-h-0 min-w-0 w-full flex-1">
          <ResizablePanel
            ref={mainPanelRef}
            defaultSize={isRightPanelVisible && !isMobile ? 32 : 100}
            minSize={25}
            collapsible
            collapsedSize={0}
          >
            {mainContent}
          </ResizablePanel>
          {canShowRightPanel && (
            <>
              <ResizableHandle
                withHandle
                className={isMobile || isFocusModeActive ? 'hidden' : ''}
              />
              <ResizablePanel
                ref={rightPanelRef}
                defaultSize={isRightPanelVisible && !isMobile ? rightPanelSize : 0}
                minSize={MIN_RIGHT_PANEL_SIZE}
                // Focus mode collapses the main panel, so the right panel must
                // be allowed to take the whole width.
                maxSize={isFocusModeActive ? 100 : MAX_RIGHT_PANEL_SIZE}
                onResize={handleRightPanelResize}
                collapsible
                collapsedSize={0}
                onCollapse={() => setRightPanelOpen(false)}
                onExpand={() => setRightPanelOpen(true)}
                // On mobile the right panel is rendered as an overlay below.
                className={isMobile ? 'hidden' : ''}
              >
                {!isMobile && <RightPanel />}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {isMobile && canShowRightPanel && isRightPanelOpen && (
          <>
            <button
              type="button"
              className="absolute inset-0 z-30 bg-black/40"
              aria-label="Close right panel"
              onClick={() => setRightPanelOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 z-40 w-[min(92vw,420px)]">
              <RightPanel />
            </div>
          </>
        )}
      </div>
    </SidebarInset>
  );
}

const ViewLoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
    Loading view...
  </div>
);

export function AppLayout() {
  const { view, setView, isSidebarOpen, setSidebarOpen } = useLayoutStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setView('settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setView]);

  const mainContent = (
    <div className="flex flex-col min-w-0 h-full">
      <div className="min-h-0 flex-1">
        <Suspense fallback={<ViewLoadingFallback />}>
          {view === 'agents-md' && <AgentsMdView />}
          {view === 'agent' && <AgentView />}
          {view === 'automations' && <AutoMationsView />}
          {view === 'plugins' && <PluginsView />}
          {view === 'insights' && <InsightsView />}
          {view === 'bot' && <BotChatView />}
        </Suspense>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      {view === 'settings' ? (
        <Suspense fallback={<ViewLoadingFallback />}>
          <SettingsView />
        </Suspense>
      ) : (
        <SidebarProvider
          open={isSidebarOpen}
          onOpenChange={setSidebarOpen}
          className="h-full min-h-0"
        >
          <AppSideBar />
          {/* Single layout component for both mobile and desktop.
              Keeping mainContent at a stable tree position prevents lazy views
              from unmounting/remounting when the viewport crosses the mobile breakpoint. */}
          <LayoutContent mainContent={mainContent} />
        </SidebarProvider>
      )}
    </div>
  );
}
