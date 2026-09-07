import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { lazy, Suspense, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import './App.css';

import { useCodexEvents } from '@/components/codex/hooks';
import { QuitDialog } from '@/components/dialogs';
import { AppLayout } from '@/components/layout';
import { MobileShell } from '@/components/mobile/MobileShell';
import { PairingView } from '@/components/pairing/PairingView';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { HistoryProjectsDialog } from '@/features/ProjectSelector';
import { TodoCaptureHint } from '@/features/todos/TodoCaptureHint';
import { isDesktopTauri, isPhone } from '@/hooks/runtime';
import { useAppDeepLink } from '@/hooks/useAppDeepLink';
import { useDoubleShiftCapture } from '@/hooks/useDoubleShiftCapture';
import { useUrlParamThread } from '@/hooks/useUrlParamThread';
import { hasActiveWork } from '@/lib/hasActiveWork';
import { i18n } from '@/lib/i18n';
import { initSettingsSync, loadRemoteSettings, loadSettings } from '@/lib/settings';
import { initializeCodexAsync } from '@/services/apiAdapt';
import { usePairingStore } from '@/stores/usePairingStore';
import type { InitializeResponse } from './bindings';

const AboutView = lazy(() => import('@/views/AboutView'));

function AppShell() {
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  // True once codex backend signals it is ready; only desktop Tauri has a
  // local backend to initialize — mobile and web talk to a remote one.
  const [codexReady, setCodexReady] = useState(!isDesktopTauri());

  useEffect(() => {
    // A phone has no settings file of its own: the projects it shows are the
    // paired desktop's. `/api/settings` is the direct route; reading the file
    // over the remote filesystem API is the fallback if that answers nothing.
    const load = isPhone()
      ? loadRemoteSettings().then((ok) => (ok ? undefined : loadSettings()))
      : loadSettings();
    load.finally(() => setSettingsReady(true));
  }, []);
  useEffect(() => {
    // Only the machine that owns the settings file writes it back — a phone
    // browsing a desktop's projects must not overwrite them.
    if (isPhone()) return;
    return initSettingsSync();
  }, []);

  useEffect(() => {
    if (!isDesktopTauri()) {
      return;
    }

    initializeCodexAsync().catch((error) => {
      console.warn('Failed to initialize codex asynchronously', error);
    });

    // Listen for codex initialized event
    const unlisten = listen<InitializeResponse>('codex:initialized', (event) => {
      console.log('[App] Codex initialized, userAgent:', event.payload.userAgent);
      setCodexReady(true);
    });

    // Cmd+Q quits immediately when nothing is running, otherwise confirms first
    const unlistenQuit = listen('quit-requested', () => {
      void hasActiveWork().then((active) => {
        if (active) {
          setQuitDialogOpen(true);
        } else {
          void invoke('quit_app');
        }
      });
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenQuit.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to codex events only after backend is initialized
  useCodexEvents(codexReady);

  // Shift-Shift on a text selection captures it as a todo
  useDoubleShiftCapture();

  // Web-mode deep link: ?agent=codex&thread=<id>&cwd=<path> (or agent=cc&session=<id>)
  useUrlParamThread(codexReady);

  // Wait for settings load before rendering
  if (!settingsReady) return null;

  // A phone gets its own two-screen shell instead of the desktop layout. It
  // shows the projects the desktop has added and nothing more — adding or
  // removing them stays on the machine that owns them.
  if (isPhone()) return <MobileShell />;

  return (
    <>
      <AppLayout />
      <TodoCaptureHint />
      <HistoryProjectsDialog />
      <QuitDialog open={quitDialogOpen} onOpenChange={setQuitDialogOpen} />
    </>
  );
}

function AppEntry() {
  useAppDeepLink();

  const isPaired = usePairingStore((s) => s.desktops.length > 0);

  // A phone has no local backend, so it cannot do anything until it is paired.
  if (isPhone() && !isPaired) return <PairingView />;

  return <AppShell />;
}

export default function App() {
  const isAboutWindow = window.location.pathname === '/about';

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          {isAboutWindow ? (
            <Suspense>
              <AboutView />
            </Suspense>
          ) : (
            <>
              <AppEntry />
              <Toaster />
            </>
          )}
        </TooltipProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}
