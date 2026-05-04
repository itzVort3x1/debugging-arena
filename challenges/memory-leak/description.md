# Chat Room Memory Leak

## Bug report from #ops

After running a few hours under realistic user churn (people joining and
leaving rooms), the chat service starts printing:

```
(node) MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 message listeners added. Use emitter.setMaxListeners() to increase limit.
```

Heap usage climbs linearly with the number of join/leave cycles, even when
the active user count stays flat.

## What we know

- Each user gets attached as a listener on a shared `EventEmitter` for the
  `"message"` channel when they join, so broadcasts reach them.
- Bumping `setMaxListeners(Infinity)` would silence the warning but does not
  fix the underlying leak — heap still grows.
- Restarting the process resets memory, then the leak recurs.

## Your task

`src/room-manager.ts` is the relevant file. The test in
`tests/challenge.test.ts` reproduces the leak via `listenerCount` and
broadcast assertions.

Make all tests pass without modifying the test file.
