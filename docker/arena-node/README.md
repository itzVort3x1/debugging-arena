# arena-node image

Minimal container image for running Node/jest challenge suites in isolation.
Selected when a challenge's `meta.runtime` is `node` (the default) and
`ARENA_RUNNER=docker` (the default).

## Build

```bash
npm run docker:build:node
# equivalent to: docker build -t arena-node docker/arena-node
```

Rebuild after changing the pinned toolchain in `package.json` here (keep those
versions in sync with the app's own jest/ts-jest/ts-node/typescript).

## How it's used

`src/lib/runner/exec/docker.ts` runs each suite as:

```
docker run --rm --network=none --cap-drop=ALL --security-opt=no-new-privileges \
  --pids-limit=256 --memory=512m --cpus=1 --read-only --tmpfs=/tmp \
  -v <sandbox-temp-dir>:/work -v arena-node-cache:/cache -w /work \
  arena-node node /opt/arena/node_modules/jest/bin/jest.js ...
```

- **`/work`** — the materialized sandbox (user files + read-only tests +
  generated `jest.config.js`/`tsconfig.json`), bind-mounted from a host temp
  dir. Jest writes `.jest-result.json` here; the host reads it back for scoring.
- **`/cache`** — a named volume (`arena-node-cache`) holding ts-jest's compiled
  output, persisted across runs so suites don't recompile every time.
- The **host environment is not forwarded** — no `--env`/`process.env` leak.

## Local dev without Docker

Set `ARENA_RUNNER=host` to run suites in-process on the host instead (no
isolation). Intended only for dev/CI where Docker isn't available.
