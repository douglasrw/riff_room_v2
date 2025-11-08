/**
 * WebSocket service for real-time communication with backend
 */

/**
 * Get WebSocket URL from API URL environment variable.
 * Converts http/https to ws/wss and defaults to localhost for development.
 */
const getDefaultWsUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8007';
  // Convert http → ws, https → wss
  return apiUrl.replace(/^http/, 'ws');
};

export interface WebSocketMessage {
  type: 'progress' | 'complete' | 'error' | 'pong';
  data: any;
}

export interface ProgressData {
  progress: number;
  status: string;
  metadata?: Record<string, any>;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type ErrorHandler = (error: Event) => void;
export type CloseHandler = () => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private clientId: string;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private closeHandlers: Set<CloseHandler> = new Set();
  // FIXED H14: Track reconnection timeout to clean up on disconnect
  private reconnectTimeout: number | null = null;
  // FIXED H13: Track intentional disconnect to prevent reconnection
  private isIntentionalDisconnect = false;

  constructor(clientId: string, baseUrl?: string) {
    this.clientId = clientId;
    // FIXED N7: Use environment variable instead of hardcoded URL
    const wsUrl = baseUrl || getDefaultWsUrl();
    this.url = `${wsUrl}/ws/${clientId}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    // FIXED: Guard against multiple concurrent connect calls
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // FIXED H13: Reset intentional disconnect flag when connecting
    this.isIntentionalDisconnect = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`WebSocket connected: ${this.clientId}`);
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.errorHandlers.forEach((handler) => handler(error));
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.stopPingInterval();
        this.closeHandlers.forEach((handler) => handler());
        // FIXED H13: Only reconnect if disconnect was not intentional
        if (!this.isIntentionalDisconnect) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    // FIXED H13: Mark as intentional disconnect to prevent reconnection
    this.isIntentionalDisconnect = true;
    this.stopPingInterval();
    // FIXED H14: Clear reconnection timeout if pending
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // FIXED: Clear handlers to prevent memory leaks across reconnects
    this.messageHandlers.clear();
    this.errorHandlers.clear();
    this.closeHandlers.clear();
  }

  /**
   * Send a message to the server
   */
  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Register a close handler
   */
  onClose(handler: CloseHandler): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  /**
   * Get current connection state
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    // FIXED H14: Store timeout ID for cleanup
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    // FIXED M3: Reduced from 30s to 15s to prevent proxy timeouts
    // Many proxies/load balancers timeout idle connections at 60s
    this.pingInterval = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, 15000); // Ping every 15 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
