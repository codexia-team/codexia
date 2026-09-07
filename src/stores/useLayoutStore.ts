import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentType } from './useAgentSettingsStore';

let terminalCounter = 1;

export interface TerminalTab {
  id: string;
  label: string;
}

export type viewType =
  | 'automations'
  | 'agents-md'
  | 'agent'
  | 'learn'
  | 'plugins'
  | 'settings'
  | 'usage'
  | 'insights'
  | 'bot';

export type SidebarMode = 'agent' | 'bot';

export type RightPanelTab = 'diff' | 'tasks' | 'todo' | 'terminal' | 'webpreview' | 'files';

interface LayoutStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isRightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  rightPanelSize: number;
  setRightPanelSize: (size: number) => void;
  view: viewType;
  setView: (view: viewType) => void;
  // Focus mode: hides the left main content and lets the right panel fill the width
  isRightPanelFocused: boolean;
  setIsRightPanelFocused: (focused: boolean) => void;
  toggleRightPanelFocused: () => void;
  activeSidebarTab: AgentType;
  setActiveSidebarTab: (tab: AgentType) => void;
  /** Which half of the sidebar is showing: the agent workspaces, or the bots. */
  sidebarMode: SidebarMode;
  setSidebarMode: (mode: SidebarMode) => void;
  activeRightPanelTab: RightPanelTab | null;
  setActiveRightPanelTab: (tab: RightPanelTab) => void;
  // Right panel tabs currently open in the header bar; closable independently of activeRightPanelTab.
  openRightPanelTabs: RightPanelTab[];
  closeRightPanelTab: (tab: RightPanelTab) => void;
  selectedAutomationTaskId: string | null;
  setSelectedAutomationTaskId: (taskId: string | null) => void;
  // Terminal tabs (sessions shown inside the right panel's Terminal tab)
  terminals: TerminalTab[];
  activeTerminalId: string | null;
  addTerminal: () => void;
  removeTerminal: (id: string) => void;
  setActiveTerminalId: (id: string) => void;
  diffWordWrap: boolean;
  setDiffWordWrap: (enabled: boolean) => void;
  diffSplitMode: boolean;
  setDiffSplitMode: (enabled: boolean) => void;
  // Sidebar project collapse state: projectPath -> isOpen
  expandedProjects: Record<string, boolean>;
  setProjectExpanded: (project: string, open: boolean) => void;
  // Sidebar "Pinned" section collapse state
  isPinnedListOpen: boolean;
  setPinnedListOpen: (open: boolean) => void;
  // Bot mode tab badge indicator state
  hasSeenBotTab: boolean;
  setHasSeenBotTab: (seen: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      isRightPanelOpen: false,
      toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
      rightPanelSize: 45,
      setRightPanelSize: (size) => set({ rightPanelSize: size }),
      view: 'agent',
      setView: (view) => set({ view }),
      isRightPanelFocused: false,
      setIsRightPanelFocused: (focused: boolean) => set({ isRightPanelFocused: focused }),
      toggleRightPanelFocused: () =>
        set((state) => ({ isRightPanelFocused: !state.isRightPanelFocused })),
      activeSidebarTab: 'codex',
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      sidebarMode: 'agent',
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
      activeRightPanelTab: 'diff',
      setActiveRightPanelTab: (tab) =>
        set((state) => ({
          activeRightPanelTab: tab,
          openRightPanelTabs: state.openRightPanelTabs.includes(tab)
            ? state.openRightPanelTabs
            : [...state.openRightPanelTabs, tab],
        })),
      openRightPanelTabs: ['diff'],
      closeRightPanelTab: (tab) =>
        set((state) => {
          const index = state.openRightPanelTabs.indexOf(tab);
          if (index === -1) return {};
          const next = state.openRightPanelTabs.filter((t) => t !== tab);
          if (state.activeRightPanelTab !== tab) {
            return { openRightPanelTabs: next };
          }
          const nextActive = next[index - 1] ?? next[0] ?? null;
          return { openRightPanelTabs: next, activeRightPanelTab: nextActive };
        }),
      selectedAutomationTaskId: null,
      setSelectedAutomationTaskId: (taskId) => set({ selectedAutomationTaskId: taskId }),
      // Terminal tabs
      terminals: [],
      activeTerminalId: null,
      addTerminal: () =>
        set((state) => {
          const id = `term-${terminalCounter++}`;
          const label = `Terminal ${terminalCounter - 1}`;
          const tab: TerminalTab = { id, label };
          return {
            terminals: [...state.terminals, tab],
            activeTerminalId: id,
          };
        }),
      removeTerminal: (id) =>
        set((state) => {
          const next = state.terminals.filter((t) => t.id !== id);
          const activeId =
            state.activeTerminalId === id
              ? (next[next.length - 1]?.id ?? null)
              : state.activeTerminalId;
          return {
            terminals: next,
            activeTerminalId: activeId,
          };
        }),
      setActiveTerminalId: (id) => set({ activeTerminalId: id }),
      diffWordWrap: false,
      setDiffWordWrap: (enabled) => set({ diffWordWrap: enabled }),
      diffSplitMode: false,
      setDiffSplitMode: (enabled) => set({ diffSplitMode: enabled }),
      expandedProjects: {},
      setProjectExpanded: (project, open) =>
        set((state) => ({
          expandedProjects: { ...state.expandedProjects, [project]: open },
        })),
      isPinnedListOpen: true,
      setPinnedListOpen: (open) => set({ isPinnedListOpen: open }),
      hasSeenBotTab: false,
      setHasSeenBotTab: (hasSeenBotTab) => set({ hasSeenBotTab }),
    }),
    {
      name: 'layout-storage',
      version: 7,
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        isRightPanelOpen: state.isRightPanelOpen,
        rightPanelSize: state.rightPanelSize,
        view: state.view,
        isRightPanelFocused: state.isRightPanelFocused,
        activeSidebarTab: state.activeSidebarTab,
        sidebarMode: state.sidebarMode,
        activeRightPanelTab: state.activeRightPanelTab,
        openRightPanelTabs: state.openRightPanelTabs,
        diffWordWrap: state.diffWordWrap,
        diffSplitMode: state.diffSplitMode,
        expandedProjects: state.expandedProjects,
        isPinnedListOpen: state.isPinnedListOpen,
        hasSeenBotTab: state.hasSeenBotTab,
      }),
      migrate: (persistedState: any, version: number) => {
        if (version < 5) {
          if (persistedState && 'history' in persistedState) {
            delete persistedState.history;
          }
        }
        if (version < 6 && persistedState) {
          // The notes panel became the todos panel.
          if (persistedState.activeRightPanelTab === 'note') {
            persistedState.activeRightPanelTab = 'todo';
          }
          if (Array.isArray(persistedState.openRightPanelTabs)) {
            persistedState.openRightPanelTabs = persistedState.openRightPanelTabs.map(
              (tab: string) => (tab === 'note' ? 'todo' : tab)
            );
          }
        }
        if (version < 7 && persistedState) {
          // The Bot tab is new, so a store written before it has no mode and
          // must land on the sidebar it was last actually showing.
          persistedState.sidebarMode = 'agent';
          if (persistedState.view === 'bot') persistedState.view = 'agent';
        }
        return persistedState;
      },
    }
  )
);
