# arena-python — minimal image for running Python/pytest challenge suites in
# isolation. Mirrors arena-node: the runner (src/lib/runner/exec/docker.ts) runs
# pytest here with the host environment dropped, no network, capabilities
# dropped, a read-only rootfs, and resource caps.
FROM python:3.12-slim

# Pinned test toolchain. pytest lands on PATH at /usr/local/bin/pytest.
RUN pip install --no-cache-dir pytest==8.3.4

# The root filesystem is mounted read-only at runtime; Python needs a writable
# HOME, which /tmp provides (mounted as tmpfs by the runner).
ENV HOME=/tmp

# Persistent pytest cache lives on a named volume mounted at /cache. python:slim
# ships no non-root user, so create one and pre-own /cache — a fresh volume then
# inherits that ownership, letting the unprivileged user below write to it.
RUN useradd --create-home --uid 1000 arena \
    && mkdir -p /cache && chown arena:arena /cache

# Drop root: challenge/user code runs as the unprivileged `arena` user.
USER arena

WORKDIR /work
