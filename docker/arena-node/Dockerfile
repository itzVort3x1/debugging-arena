# arena-node — minimal image for running Node/jest challenge suites in isolation.
#
# The test toolchain (jest, ts-jest, ts-node, typescript) is baked in at a fixed
# location so the throwaway sandbox mounted at /work needs no node_modules of its
# own. The runner (src/lib/runner/exec/docker.ts) invokes jest here with the host
# environment dropped, no network, capabilities dropped, and resource caps.
FROM node:22-slim

# Install the pinned toolchain into a fixed, discoverable location. The runner's
# ExecEnv points jest/ts-jest at /opt/arena/node_modules/... — keep in sync.
WORKDIR /opt/arena
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=dev \
    && npm cache clean --force

# Put the tool bins on PATH (belt-and-suspenders; the runner uses absolute paths).
ENV PATH="/opt/arena/node_modules/.bin:${PATH}"
# The root filesystem is mounted read-only at runtime; ts-jest/ts-node need a
# writable HOME, which /tmp provides (mounted as tmpfs by the runner).
ENV HOME=/tmp

# Persistent ts-jest compile cache lives on a named volume mounted at /cache.
# Creating it here node-owned means a fresh volume inherits that ownership, so
# the unprivileged user below can write to it.
RUN mkdir -p /cache && chown node:node /cache

# Drop root: challenge/user code runs as the unprivileged built-in `node` user.
USER node

WORKDIR /work
