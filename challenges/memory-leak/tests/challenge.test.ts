import { RoomManager } from "../src/room-manager";

describe("RoomManager listener cleanup", () => {
  it("attaches one message listener per joined user", () => {
    const rm = new RoomManager();
    rm.join("u1");
    expect(rm.listenerCount()).toBe(1);
    rm.join("u2");
    expect(rm.listenerCount()).toBe(2);
  });

  it("removes the listener when a user leaves", () => {
    const rm = new RoomManager();
    rm.join("u1");
    rm.join("u2");
    rm.leave("u1");
    expect(rm.listenerCount()).toBe(1);
    rm.leave("u2");
    expect(rm.listenerCount()).toBe(0);
  });

  it("does not leak listeners across many join/leave cycles", () => {
    const rm = new RoomManager();
    for (let i = 0; i < 100; i++) {
      rm.join(`u${i}`);
      rm.leave(`u${i}`);
    }
    expect(rm.listenerCount()).toBe(0);
  });

  it("a user who has left no longer receives broadcasts", () => {
    const rm = new RoomManager();
    const u1 = rm.join("u1");
    rm.broadcast("hello");
    expect(u1.inbox).toEqual(["hello"]);

    rm.leave("u1");
    rm.broadcast("world");
    expect(u1.inbox).toEqual(["hello"]);
  });

  it("active users still receive broadcasts after others leave", () => {
    const rm = new RoomManager();
    const u1 = rm.join("u1");
    const u2 = rm.join("u2");
    rm.leave("u1");
    rm.broadcast("ping");
    expect(u1.inbox).toEqual([]);
    expect(u2.inbox).toEqual(["ping"]);
  });
});
