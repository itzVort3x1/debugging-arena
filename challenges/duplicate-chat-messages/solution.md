# Solution

## Root cause

`onDisconnect` is a no-op. Every `onConnection` creates a **new** subscriber
and subscribes it to the `"chat"` channel, but nothing ever tears the old one
down. After one reconnect, two subscribers are both live on the channel, so
each publish is delivered twice — and it keeps stacking with every reconnect
cycle.

The fix is to track each socket's subscriber and actually dispose of it on
disconnect (`unsubscribe()` + `quit()`), removing it from the map.

## Fixed `src/chat-server.ts`

```ts
import type { SubscriberClient, SubscriberFactory } from "./types";

export class ChatServer {
  /** Live subscriber per connected socket, so we can tear it down. */
  private subscribers = new Map<string, SubscriberClient>();

  constructor(private subscriberFactory: SubscriberFactory) {}

  onConnection(socketId: string, onMessage: (msg: string) => void): void {
    // Defensive: if a socketId reconnects without a disconnect, dispose the
    // stale subscriber first so it can't double-deliver.
    this.onDisconnect(socketId);

    const sub = this.subscriberFactory.create();
    sub.subscribe("chat", onMessage);
    this.subscribers.set(socketId, sub);
  }

  onDisconnect(socketId: string): void {
    const sub = this.subscribers.get(socketId);
    if (!sub) return;

    sub.unsubscribe();
    sub.quit();
    this.subscribers.delete(socketId);
  }
}
```

## Why each test passes

- **delivers exactly once on first connect** — one subscriber, one listener.
- **removes the subscriber on disconnect** — `unsubscribe()` clears the
  listener and `quit()` marks it inactive, so the active count drops to 0.
- **no duplicates after reconnect** — the old subscriber is disposed before
  the new one connects, leaving exactly one live subscriber.
- **no stacking across 50 cycles** — each disconnect deletes its subscriber,
  so the active count returns to 0 instead of accumulating.

The `this.onDisconnect(socketId)` guard at the top of `onConnection` isn't
strictly required by the tests, but it makes the class correct against a real
socket layer that can fire a second `onConnection` for the same id.
