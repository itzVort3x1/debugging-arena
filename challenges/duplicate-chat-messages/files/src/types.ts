// Minimal interface around node-redis style clients used as per-socket subscribers.
export interface SubscriberClient {
  subscribe(channel: string, listener: (msg: string) => void): void;
  unsubscribe(): void;
  quit(): void;
}

export interface SubscriberFactory {
  create(): SubscriberClient;
}
