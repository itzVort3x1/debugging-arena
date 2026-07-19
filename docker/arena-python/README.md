# arena-python image

Minimal container image for running Python/pytest challenge suites in
isolation. Selected when a challenge's `meta.runtime` is `python`. Requires
`ARENA_RUNNER=docker` (the default) — there is no host-mode Python path, since
the app's host isn't expected to have pytest installed.

## Build

```bash
npm run docker:build:python
# equivalent to: docker build -t arena-python docker/arena-python
```

Rebuild after changing the pinned `pytest` version in the Dockerfile.

## How it's used

`src/lib/runner/exec/docker.ts` runs each suite as:

```
docker run --rm --network=none --cap-drop=ALL --security-opt=no-new-privileges \
  --pids-limit=256 --memory=512m --cpus=1 --read-only --tmpfs=/tmp \
  -v <sandbox-temp-dir>:/work -v arena-python-cache:/cache -w /work \
  arena-python pytest tests -v --junitxml /work/.pytest-result.xml ...
```

- **`/work`** — the materialized sandbox (editable files + read-only `tests/` +
  a generated `pytest.ini`), bind-mounted from a host temp dir. pytest writes
  `.pytest-result.xml` here; the host reads it back and parses the JUnit XML
  for scoring (`src/lib/runner/junit.ts`).
- **`/cache`** — the `arena-python-cache` named volume (one per image).
- The **host environment is not forwarded**.

## Sandbox import path

`pytest.ini` sets `pythonpath = .` so tests under `tests/` can import the
editable module materialized at the sandbox root (e.g. `from pricing import ...`).
