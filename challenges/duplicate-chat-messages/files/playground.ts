/**
 * Scratchpad - run this file (the "Run file" button) to exercise the chat
 * server and watch its console output. Nothing here is a test; edit freely.
 *
 * It fakes a Redis-style pub/sub so you can simulate a broadcast and count how
 * many times a socket actually receives a message. Reconnect the same socket,
 * publish once, and see how many deliveries land.
 */
import { ChatServer } from "./src/chat-server";
import type { SubscriberClient, SubscriberFactory } from "./src/types";

// Fake pub/sub: every subscriber's callback is tracked per channel so we can
// publish a message and observe the fan-out.
const channelListeners = new Map<string, Array<(msg: string) => void>>();

const factory: SubscriberFactory = {
    create(): SubscriberClient {
        let channel: string | null = null;
        let listener: ((msg: string) => void) | null = null;
        return {
            subscribe(ch, l) {
                channel = ch;
                listener = l;
                const arr = channelListeners.get(ch) ?? [];
                arr.push(l);
                channelListeners.set(ch, arr);
            },
            unsubscribe() {
                if (!channel || !listener) return;
                const arr = channelListeners.get(channel) ?? [];
                channelListeners.set(
                    channel,
                    arr.filter((x) => x !== listener),
                );
            },
            quit() {},
        };
    },
};

function publish(channel: string, msg: string): void {
    for (const cb of channelListeners.get(channel) ?? []) cb(msg);
}

const server = new ChatServer(factory);

// Same socket connects, drops, and reconnects - a common real-world sequence.
let deliveries = 0;
const onMessage = (msg: string) => {
    deliveries++;
    console.log(`socket-1 received: ${msg}`);
};

server.onConnection("socket-1", onMessage);
server.onDisconnect("socket-1");
server.onConnection("socket-1", onMessage);

console.log(
    "subscribers on 'chat':",
    (channelListeners.get("chat") ?? []).length,
);

deliveries = 0;
publish("chat", "hello world");
console.log(`one publish delivered ${deliveries} message(s) to socket-1`);
