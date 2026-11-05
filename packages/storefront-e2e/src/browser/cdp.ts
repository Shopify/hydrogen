export interface CdpEvent {
  method: string;
  params: Record<string, unknown>;
  sessionId?: string;
}

export interface CdpConnection {
  send(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<unknown>;
  close(): void;
}

interface CdpHandlers {
  onEvent(event: CdpEvent): void;
  /** Called once when the socket closes or a handler throws. */
  onClose(error: Error): void;
}

interface PendingCall {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

const CALL_TIMEOUT_MS = 15_000;
const CONNECT_TIMEOUT_MS = 15_000;
const MAX_PENDING_CALLS = 500;

export async function connectCdp(url: string, handlers: CdpHandlers): Promise<CdpConnection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Timed out connecting to the browser DevTools endpoint"));
    }, CONNECT_TIMEOUT_MS);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Could not connect to the browser DevTools endpoint"));
    });
  });

  const pending = new Map<number, PendingCall>();
  let nextId = 1;
  let closedError: Error | undefined;

  const shutdown = (error: Error) => {
    if (closedError) return;
    closedError = error;
    for (const call of pending.values()) {
      clearTimeout(call.timer);
      call.reject(error);
    }
    pending.clear();
    socket.close();
    handlers.onClose(error);
  };

  socket.addEventListener("close", () => shutdown(new Error("DevTools connection closed")));
  socket.addEventListener("message", (message) => {
    try {
      dispatch(typeof message.data === "string" ? message.data : "");
    } catch (error) {
      shutdown(error instanceof Error ? error : new Error(String(error)));
    }
  });

  function dispatch(raw: string) {
    const message: unknown = JSON.parse(raw);
    if (!isRecord(message)) return;
    if (typeof message.id === "number") {
      settle(message.id, message);
      return;
    }
    if (typeof message.method !== "string") return;
    handlers.onEvent({
      method: message.method,
      params: isRecord(message.params) ? message.params : {},
      sessionId: typeof message.sessionId === "string" ? message.sessionId : undefined,
    });
  }

  function settle(id: number, message: Record<string, unknown>) {
    const call = pending.get(id);
    if (!call) return;
    pending.delete(id);
    clearTimeout(call.timer);
    if (isRecord(message.error)) {
      call.reject(new Error(String(message.error.message ?? "CDP error")));
    } else {
      call.resolve(message.result);
    }
  }

  return {
    async send(method, params = {}, sessionId) {
      if (closedError) throw closedError;
      if (pending.size >= MAX_PENDING_CALLS) throw new Error("Too many pending CDP calls");
      const id = nextId++;
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP call timed out: ${method}`));
        }, CALL_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
    close() {
      shutdown(new Error("DevTools connection closed"));
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
