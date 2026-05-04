import { EventEmitter } from "events";

export interface User {
  id: string;
  inbox: string[];
}

/**
 * Tracks users in a chat room and broadcasts messages to all of them
 * via a shared EventEmitter.
 */
export class RoomManager {
  private emitter = new EventEmitter();
  private users = new Map<string, User>();

  /** Add a user to the room. The returned User accumulates broadcast messages in `inbox`. */
  join(userId: string): User {
    const user: User = { id: userId, inbox: [] };
    this.users.set(userId, user);

    this.emitter.on("message", (msg: string) => {
      user.inbox.push(msg);
    });

    return user;
  }

  /** Remove a user from the room. They should stop receiving broadcasts. */
  leave(userId: string): void {
    this.users.delete(userId);
  }

  /** Send a message to every user currently in the room. */
  broadcast(msg: string): void {
    this.emitter.emit("message", msg);
  }

  /** Diagnostic: how many "message" listeners are attached right now. */
  listenerCount(): number {
    return this.emitter.listenerCount("message");
  }
}
