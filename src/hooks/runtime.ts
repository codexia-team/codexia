import { convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { desktopBaseUrl, pairedDesktop } from '@/stores/usePairingStore';

export const DEFAULT_PORT = 7420;
const configuredPort = Number(import.meta.env.VITE_WEB_PORT || DEFAULT_PORT);

/**
 * Port the desktop app's own loopback API server listens on — always up,
 * independent of the remote toggle. See `commands::local_server::LOCAL_PORT`
 * in src-tauri.
 */
const DESKTOP_LOCAL_PORT = 7419;

/**
 * The host platform, or null in the web build where there is no Tauri runtime.
 *
 * `platform()` is synchronous and reads a global the plugin injects as a
 * document-start script, so it is already there when this module evaluates —
 * no user-agent sniffing or async probe needed.
 */
const _platform = isTauri() ? platform() : null;

const resolveApiBase = () => {
  if (typeof window === 'undefined') {
    return `http://127.0.0.1:${configuredPort}`;
  }

  // Paired: talk straight to that machine, reachable over the tailnet. This is
  // the only case where the API lives on a different host than the frontend,
  // so it wins over the origin/dev rules below regardless of platform.
  const desktop = pairedDesktop();
  if (desktop) {
    return desktopBaseUrl(desktop);
  }

  // The webview's own origin (`tauri://localhost`, or `http://tauri.localhost`
  // on Windows/Android) isn't an HTTP address `fetch` can hit — the desktop
  // app's own loopback server always lives on 127.0.0.1, on its own port, no
  // pairing token needed (see `require_device_token`'s loopback exemption).
  if (isDesktopTauri()) {
    return `http://127.0.0.1:${DESKTOP_LOCAL_PORT}`;
  }

  if (import.meta.env.PROD && !isPhone()) {
    // Desktop web-server: assets and API share the same origin.
    return window.location.origin;
  }

  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const host = window.location.hostname || '127.0.0.1';
  return `${protocol}://${host}:${configuredPort}`;
};

/** The paired desktop's device token, when this build needs to authenticate. */
const authToken = () => pairedDesktop()?.token ?? null;

/** `Authorization` header for `fetch`, empty when talking to a local backend. */
export const authHeaders = (): Record<string, string> => {
  const token = authToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Appends the device token as a query parameter.
 *
 * `EventSource` and `WebSocket` cannot set headers, so the server accepts the
 * token this way too — see `presented_token` in `web/src/auth.rs`. Applied
 * inside the stream URL builders below so no call site can forget it.
 */
const withToken = (url: string): string => {
  const token = authToken();
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
};

export const buildUrl = (path: string) => `${resolveApiBase()}${path}`;

/** `EventSource` URL: same origin rules as `buildUrl`, plus the device token. */
export const buildEventUrl = (path: string) => withToken(buildUrl(path));

/** `WebSocket` URL: same origin rules as `buildUrl`, plus the device token. */
export const buildWsUrl = (path: string) =>
  withToken(`${resolveApiBase().replace(/^http/, 'ws')}${path}`);

export { isTauri };

export const isMacos = () => _platform === 'macos';

export const isPhone = () => _platform === 'ios' || _platform === 'android';

/** True only on desktop Tauri — use this to guard invokeTauri() calls. */
export const isDesktopTauri = () => _platform !== null && !isPhone();

/**
 * URL for a local file, usable as an `<img>`/`<video>` source.
 *
 * The desktop build goes through Tauri's asset protocol; the web build has no
 * Tauri runtime (calling `convertFileSrc` there throws), so it streams the file
 * from the backend instead.
 */
export const fileSrc = (path: string): string => {
  if (isTauri()) return convertFileSrc(path);
  return buildEventUrl(`/api/filesystem/asset?path=${encodeURIComponent(path)}`);
};
