/**
 * Scratchpad — run this file (the "Run file" button) to exercise the room
 * manager and watch its console output. Nothing here is a test; edit freely.
 *
 * Join a couple of users, have one leave, broadcast a message, then inspect
 * the live listener count and each user's inbox.
 */
import { RoomManager } from "./src/room-manager";

const room = new RoomManager();

const alice = room.join("alice");
const bob = room.join("bob");
console.log("listeners after alice + bob join:", room.listenerCount());

room.leave("bob");
console.log("listeners after bob leaves:", room.listenerCount());

room.broadcast("hi all");
console.log("alice inbox:", alice.inbox);
console.log("bob inbox (bob already left):", bob.inbox);
