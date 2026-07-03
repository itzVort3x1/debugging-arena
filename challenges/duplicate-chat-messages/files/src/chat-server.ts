import type { SubscriberClient, SubscriberFactory } from "./types";

/**
 * Wires Redis pub/sub broadcasts to per-socket message handlers.
 * One subscriber client per connection so each socket gets its own
 * delivery callback.
 */
export class ChatServer {
    constructor(private subscriberFactory: SubscriberFactory) {}

    /** Called by the websocket layer when a client connects. */
    onConnection(socketId: string, onMessage: (msg: string) => void): void {
        const sub = this.subscriberFactory.create();
        sub.subscribe("chat", onMessage);
    }

    /** Called by the websocket layer when a client disconnects. */
    onDisconnect(socketId: string): void {
        // Nothing to do - the subscriber is garbage-collected with the socket.
    }
}
