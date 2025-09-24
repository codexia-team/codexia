import type { InvokeArgs, InvokeOptions } from "@tauri-apps/api/core";
import type {
  Event as TauriEvent,
  EventCallback,
  EventName,
  Options as EventOptions,
  UnlistenFn,
} from "@tauri-apps/api/event";

interface RpcEnvelope {
  status?: "success" | "error" | string;
  payload?: unknown;
}

interface PendingCall {
  resolve: (value: RpcEnvelope) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let websocket: WebSocket | null = null;
let websocketReady: Promise<void> | null = null;
const pendingInvocations = new Map<number, PendingCall>();
let messageCounter = 0;
let baseHandlerBound = false;

let tauriCoreModulePromise: Promise<typeof import("@tauri-apps/api/core")> | null = null;
let tauriEventModulePromise: Promise<typeof import("@tauri-apps/api/event")> | null = null;

async function loadTauriCore() {
  if (!tauriCoreModulePromise) {
    // Lazily import the native Tauri API so web builds do not touch window.__TAURI_INTERNALS__.
    tauriCoreModulePromise = import("@tauri-apps/api/core");
  }

  return tauriCoreModulePromise;
}

async function loadTauriEvent() {
  if (!tauriEventModulePromise) {
    tauriEventModulePromise = import("@tauri-apps/api/event");
  }

  return tauriEventModulePromise;
}

function isNativeTauri(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const internals = (window as any).__TAURI_INTERNALS__;
  const legacyInternals = (window as any).__TAURI__;
  return Boolean(internals?.invoke || legacyInternals?.invoke);
}

function websocketUrl(): string {
  if (typeof window === "undefined") {
    throw new Error("WebSocket is not available in this environment");
  }

  const { protocol, host } = window.location;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}/remote_ui_ws`;
}

function ensureBaseHandler(socket: WebSocket) {
  if (baseHandlerBound) {
    return;
  }

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const parsed = JSON.parse(event.data as string);
      if (parsed && typeof parsed.id === "number" && parsed.payload !== undefined) {
        const deferred = pendingInvocations.get(parsed.id);
        if (!deferred) {
          return;
        }

        pendingInvocations.delete(parsed.id);
        clearTimeout(deferred.timeout);
        try {
          const envelope = parseEnvelope(parsed.payload);
          deferred.resolve(envelope);
        } catch (error) {
          deferred.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    } catch (error) {
      console.error("Failed to handle remote message", error);
    }
  });

  baseHandlerBound = true;
}

function resetWebsocketState(error?: Error) {
  websocket = null;
  websocketReady = null;
  baseHandlerBound = false;

  for (const [id, pending] of pendingInvocations.entries()) {
    clearTimeout(pending.timeout);
    pending.reject(
      error ?? new Error(`Remote bridge disconnected before completing invocation ${id}`),
    );
    pendingInvocations.delete(id);
  }
}

async function ensureWebsocket(): Promise<void> {
  if (isNativeTauri()) {
    return;
  }

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    return;
  }

  if (websocketReady) {
    return websocketReady;
  }

  websocketReady = new Promise<void>((resolve, reject) => {
    try {
      const socket = new WebSocket(websocketUrl());
      websocket = socket;

      socket.addEventListener("open", () => {
        ensureBaseHandler(socket);
        resolve();
      });

      socket.addEventListener("close", () => {
        resetWebsocketState();
      });

      socket.addEventListener("error", (event) => {
        const errorMessage = (event as ErrorEvent)?.message ?? "Remote bridge error";
        const error = new Error(errorMessage);
        resetWebsocketState(error);
        reject(error);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      resetWebsocketState(err);
      reject(err);
    }
  });

  return websocketReady;
}

function parseEnvelope(raw: unknown): RpcEnvelope {
  if (raw === null || raw === undefined) {
    return {};
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as RpcEnvelope;
    } catch (error) {
      throw new Error(`Invalid payload received from remote bridge: ${raw}`);
    }
  }

  if (typeof raw === "object") {
    return raw as RpcEnvelope;
  }

  return { payload: raw };
}

export async function invoke<T>(
  cmd: string,
  args?: InvokeArgs,
  options?: InvokeOptions,
): Promise<T> {
  if (isNativeTauri()) {
    const { invoke: tauriInvoke } = await loadTauriCore();
    return tauriInvoke(cmd, args, options);
  }

  await ensureWebsocket();

  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("Remote bridge is not connected");
  }

  return new Promise<T>((resolve, reject) => {
    const id = ++messageCounter;
    const timeoutMs = 30_000;

    const timeout = setTimeout(() => {
      pendingInvocations.delete(id);
      reject(new Error(`Remote invoke timeout for command '${cmd}'`));
    }, timeoutMs);

    pendingInvocations.set(id, {
      resolve: (envelope) => {
        const status = envelope.status ?? "success";
        if (status === "success") {
          resolve(envelope.payload as T);
        } else {
          reject(new Error(String(envelope.payload ?? `Remote error invoking '${cmd}'`)));
        }
      },
      reject,
      timeout,
    });

    const message = {
      id,
      cmd,
      args,
      option: options,
    };

    try {
      websocket!.send(JSON.stringify(message));
    } catch (error) {
      clearTimeout(timeout);
      pendingInvocations.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function listen<T>(
  event: EventName,
  handler: EventCallback<T>,
  options?: EventOptions,
): Promise<UnlistenFn> {
  if (isNativeTauri()) {
    const { listen: tauriListen } = await loadTauriEvent();
    return tauriListen(event, handler, options);
  }

  await ensureWebsocket();

  if (!websocket) {
    throw new Error("Remote bridge is not connected");
  }

  const messageHandler = (incoming: MessageEvent) => {
    try {
      const parsed = JSON.parse(incoming.data as string);
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      if (parsed.event !== event) {
        return;
      }

      handler(parsed as TauriEvent<T>);
    } catch (error) {
      console.error("Failed to process remote event", error);
    }
  };

  websocket.addEventListener("message", messageHandler);

  return () => {
    websocket?.removeEventListener("message", messageHandler);
  };
}

export function isRemoteRuntime(): boolean {
  return !isNativeTauri();
}

export type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
