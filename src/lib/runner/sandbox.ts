import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ChallengeDefinition } from "../../../challenges/_schema";

export interface Sandbox {
  /** Absolute path to the materialized temp directory. */
  cwd: string;
  /** Removes the temp directory recursively. Safe to call once. */
  cleanup: () => Promise<void>;
}

const TSCONFIG_CONTENT = JSON.stringify(
  {
    compilerOptions: {
      target: "es2020",
      module: "commonjs",
      moduleResolution: "node",
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      resolveJsonModule: true,
      isolatedModules: false,
    },
    include: ["**/*.ts"],
  },
  null,
  2
);

/**
 * Build a jest.config.js for the sandbox that resolves ts-jest by
 * absolute path. The sandbox has no node_modules, so without this jest's
 * own resolver would fail to find the transformer.
 */
function buildJestConfig(tsJestAbsPath: string): string {
  // `diagnostics: false` — skip ts-jest's type-checking. We don't ship
  // @types/jest in the sandbox tsconfig, and jest globals (describe/it/
  // expect) are injected at runtime regardless. Tests still run; we just
  // don't compile-fail on missing ambient types.
  return `module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  rootDir: __dirname,
  transform: {
    "^.+\\\\.tsx?$": [
      ${JSON.stringify(tsJestAbsPath)},
      { tsconfig: "./tsconfig.json", diagnostics: false },
    ],
  },
};
`;
}

/**
 * Materialize a working copy of a challenge into a fresh temp directory:
 *
 *   - `fileState`        → editable working files (user's edits)
 *   - `challenge.testFiles` → read-only tests (from the challenge spec)
 *   - jest.config.js + tsconfig.json
 *
 * Test files are written AFTER fileState so they cannot be overwritten
 * by a malformed fileState that happens to include a `tests/...` key.
 */
export async function materializeSandbox(
  challenge: ChallengeDefinition,
  fileState: Record<string, string>,
  tsJestAbsPath: string
): Promise<Sandbox> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "arena-run-"));

  for (const [relPath, content] of Object.entries(fileState)) {
    await writeRelative(cwd, relPath, content);
  }
  for (const f of challenge.testFiles) {
    await writeRelative(cwd, f.path, f.content);
  }
  await writeRelative(cwd, "jest.config.js", buildJestConfig(tsJestAbsPath));
  await writeRelative(cwd, "tsconfig.json", TSCONFIG_CONTENT);

  return {
    cwd,
    cleanup: () => fs.rm(cwd, { recursive: true, force: true }),
  };
}

async function writeRelative(
  root: string,
  relPath: string,
  content: string
): Promise<void> {
  const abs = path.join(root, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
}
