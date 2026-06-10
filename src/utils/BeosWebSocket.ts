export type WebSocketEvent = "open" | "message" | "error" | "close";

const url = "wss://ws.ifelse.io";

type ListenerCallback = (...args: any[]) => void;

interface SocketMessage<T = unknown> {
  event: string;
  data: T;
}

export class BeosWebSocket {
  private ws: WebSocket | null = null;

  private readonly url: string;
  private readonly protocols?: string | string[];

  private listeners: Record<WebSocketEvent, ListenerCallback[]> = {
    open: [],
    message: [],
    error: [],
    close: [],
  };

  private subscriptions = new Map<string, ListenerCallback[]>();

  constructor(protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
  }

  // =========================
  // 🔌 CONNECTION LIFECYCLE
  // =========================

  connect(): void {
    if (this.ws) return;

    this.ws = new WebSocket(this.url, this.protocols);

    this.ws.onopen = () => {
      console.log("✅ WebSocket conectado");
      this.emit("open");
    };

    this.ws.onmessage = (event) => {
      this.emit("message", event);

      try {
        const payload: SocketMessage = JSON.parse(event.data);

        const handlers = this.subscriptions.get(payload.event) ?? [];

        handlers.forEach((cb) => cb(payload.data));
      } catch {
        // ignore invalid messages
      }
    };

    this.ws.onerror = (event) => {
      console.error("🚨 WebSocket error", event);
      this.emit("error", event);
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.group("🔌 WebSocket Closed");

      console.log("Code:", event.code);
      console.log("Reason:", event.reason || "(sin motivo)");
      console.log("Was Clean:", event.wasClean);

      console.groupEnd();

      this.emit("close", event);

      this.ws = null;
    };
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  // =========================
  // 📡 SEND MESSAGE
  // =========================

  send<T = unknown>(data: T): void {
    if (!this.ws) {
      console.warn("⚠️ WebSocket no inicializado");
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        `⚠️ WebSocket no está abierto. Estado: ${this.ws.readyState}`,
      );
      return;
    }

    this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
  }

  // =========================
  // 🧠 SOCKET EVENTS
  // =========================

  on(event: WebSocketEvent, callback: ListenerCallback): void {
    this.listeners[event].push(callback);
  }

  off(event: WebSocketEvent, callback: ListenerCallback): void {
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  private emit(event: WebSocketEvent, ...args: any[]): void {
    this.listeners[event].forEach((cb) => cb(...args));
  }

  // =========================
  // 📦 BUSINESS EVENTS
  // =========================

  subscribe(event: string, callback: ListenerCallback): void {
    const list = this.subscriptions.get(event) ?? [];

    list.push(callback);

    this.subscriptions.set(event, list);
  }

  unsubscribe(event: string, callback: ListenerCallback): void {
    const list = this.subscriptions.get(event);

    if (!list) return;

    this.subscriptions.set(
      event,
      list.filter((cb) => cb !== callback),
    );
  }

  // =========================
  // 📊 GETTERS (ESTADO)
  // =========================

  get readyState(): number | null {
    return this.ws?.readyState ?? null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get isConnecting(): boolean {
    return this.ws?.readyState === WebSocket.CONNECTING;
  }

  get isClosed(): boolean {
    return !this.ws || this.ws.readyState === WebSocket.CLOSED;
  }

  get urlInfo(): string {
    return this.url;
  }

  get hasInstance(): boolean {
    return this.ws !== null;
  }

  // =========================
  // 🧹 UTILITIES
  // =========================

  clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  clearListeners(): void {
    this.listeners = {
      open: [],
      message: [],
      error: [],
      close: [],
    };
  }

  destroy(): void {
    this.clearSubscriptions();
    this.clearListeners();
    this.close();
  }
}
