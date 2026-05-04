# Duplicate Chat Messages

## Bug report from #incident-prod

Users in the chat app are reporting that messages appear multiple times in
their feed — sometimes 2x, sometimes 5x or more. The pattern correlates with
how often the user has refreshed or had connection drops in the session.

> "Every time my wifi blips, my friend's next message comes through twice.
> After a long meeting where I refreshed the page a few times, I'm getting
> every message six times."

## What we know

- Backend uses a single shared Redis instance plus per-socket subscribers
  for the broadcast channel.
- The issue is not reproducible immediately on first connect — it only shows
  up after at least one disconnect/reconnect cycle.
- Restarting the chat server fixes the duplicates temporarily, then the bug
  returns as users reconnect through the day.

## Your task

The relevant logic lives in `src/chat-server.ts`. The test in
`tests/challenge.test.ts` reproduces the bug.

Make the test pass without modifying the test file.
