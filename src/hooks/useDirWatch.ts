import { useEffect, useRef } from 'react';
import { unwatchDirectory, watchDirectory } from '@/services/apiAdapt/filesystem';

export type FsChangeEvent = {
  path: string;
  kind: string;
  is_dir?: boolean;
};

/**
 * Shared low-level hook for watching a directory via the Rust fs watcher
 * (notify + debouncer) and subscribing to its `fs_change` events.
 *
 * The Rust-side watcher is ref-counted per path, so multiple independent
 * callers can watch the same directory safely. This hook only owns:
 *   - starting/stopping the watch for `path`
 *   - subscribing/unsubscribing to `fs_change` events
 *
 * Filtering, debouncing, and refresh logic stays in the consuming hook
 * (e.g. useGitWatch, useFileTree) to keep concerns separated.
 */
export function useDirWatch(
  path: string | null,
  onChange: (event: FsChangeEvent) => void,
  enabled = true
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!path || !enabled) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        await watchDirectory(path);
      } catch {
        // Watch failures are non-fatal; caller keeps working without live updates.
      }
      if (cancelled) return;

      // The watcher runs in the web server on every platform, so its events
      // arrive over SSE and are re-dispatched as a DOM CustomEvent by
      // useSseEventBridge.
      const onWsEvent = (event: Event) => {
        const detail = (event as CustomEvent<FsChangeEvent>).detail;
        if (detail) onChangeRef.current(detail);
      };
      window.addEventListener('fs_change', onWsEvent as EventListener);
      unlisten = () => {
        window.removeEventListener('fs_change', onWsEvent as EventListener);
      };
    };

    void setup();

    return () => {
      cancelled = true;
      unlisten?.();
      void unwatchDirectory(path).catch(() => {});
    };
  }, [path, enabled]);
}
