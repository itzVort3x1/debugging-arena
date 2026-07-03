import { ChatServer } from "../src/chat-server";
import type { SubscriberClient, SubscriberFactory } from "../src/types";

class MockSubscriber implements SubscriberClient {
    channel: string | null = null;
    listener: ((msg: string) => void) | null = null;
    active = true;

    subscribe(channel: string, listener: (msg: string) => void): void {
        this.channel = channel;
        this.listener = listener;
    }
    unsubscribe(): void {
        this.listener = null;
    }
    quit(): void {
        this.active = false;
    }
}

class MockFactory implements SubscriberFactory {
    created: MockSubscriber[] = [];

    create(): MockSubscriber {
        const s = new MockSubscriber();
        this.created.push(s);
        return s;
    }

    /** Simulate Redis publishing to a channel - every active subscriber receives it. */
    publish(channel: string, msg: string): void {
        for (const s of this.created) {
            if (s.active && s.channel === channel && s.listener)
                s.listener(msg);
        }
    }

    activeSubscriberCount(): number {
        return this.created.filter((s) => s.active && s.listener !== null)
            .length;
    }
}

describe("ChatServer", () => {
    it("delivers a message exactly once on first connect", () => {
        const factory = new MockFactory();
        const server = new ChatServer(factory);
        const received: string[] = [];

        server.onConnection("sock-1", (m) => received.push(m));
        factory.publish("chat", "hello");

        expect(received).toEqual(["hello"]);
    });

    it("removes the subscriber on disconnect", () => {
        const factory = new MockFactory();
        const server = new ChatServer(factory);
        const received: string[] = [];

        server.onConnection("sock-1", (m) => received.push(m));
        expect(factory.activeSubscriberCount()).toBe(1);

        server.onDisconnect("sock-1");
        expect(factory.activeSubscriberCount()).toBe(0);

        factory.publish("chat", "hello");
        expect(received).toEqual([]);
    });

    it("does not deliver duplicates after reconnect", () => {
        const factory = new MockFactory();
        const server = new ChatServer(factory);
        const received: string[] = [];
        const onMessage = (m: string) => received.push(m);

        server.onConnection("sock-1", onMessage);
        server.onDisconnect("sock-1");
        server.onConnection("sock-2", onMessage);

        factory.publish("chat", "hello");

        expect(received).toEqual(["hello"]);
    });

    it("does not stack subscribers across many reconnect cycles", () => {
        const factory = new MockFactory();
        const server = new ChatServer(factory);
        const received: string[] = [];

        for (let i = 0; i < 50; i++) {
            const id = `sock-${i}`;
            server.onConnection(id, (m) => received.push(m));
            server.onDisconnect(id);
        }

        expect(factory.activeSubscriberCount()).toBe(0);

        factory.publish("chat", "hello");
        expect(received).toEqual([]);
    });
});
