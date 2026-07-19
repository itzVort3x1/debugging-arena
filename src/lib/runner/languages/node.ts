import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { LanguageRunner, RunCommand, TestCounts } from "./types";

/**
 * Persistent jest cache, shared across runs and users. The sandbox itself is
 * a throwaway temp dir, so without pinning the cache here jest would recompile
 * every test file with ts-jest on every run. Cache entries are keyed by file
 * content + config hash, so reuse is safe: identical test files (served from
 * the registry) and identical user edits hit the cache; changed files miss.
 */
const JEST_CACHE_DIR = path.join(os.tmpdir(), "arena-jest-cache");

/** Jest's machine-readable output, written here and read back by parseResults. */
const RESULT_FILE = ".jest-result.json";

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
            // Transpile each file in isolation (ts-jest's fast single-file
            // path). Type-checking is already off (diagnostics: false), so
            // this gives up no safety we have; it just skips the cross-file
            // analysis. Caveat: forbids `const enum` and type re-exports
            // without `export type`, which the small challenge files don't use.
            isolatedModules: true,
        },
        include: ["**/*.ts"],
    },
    null,
    2,
);

/**
 * Build a jest.config.js for the sandbox that resolves ts-jest by
 * absolute path. The sandbox has no node_modules, so without this jest's
 * own resolver would fail to find the transformer.
 */
function buildJestConfig(tsJestAbsPath: string): string {
    // `diagnostics: false` - skip ts-jest's type-checking. We don't ship
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

/** Absolute path to ts-jest inside the app's own node_modules. */
function tsJestPath(): string {
    return path.join(process.cwd(), "node_modules", "ts-jest");
}

/**
 * The original jest-based runner, now the first entry in the language
 * registry. Runtime "node" (the default) resolves to this.
 *
 * jest and ts-jest are resolved from the app's own node_modules by absolute
 * path so the sandbox doesn't need its own; both are dependencies.
 */
export const nodeRunner: LanguageRunner = {
    scaffold() {
        return {
            "jest.config.js": buildJestConfig(tsJestPath()),
            "tsconfig.json": TSCONFIG_CONTENT,
        };
    },

    command(sandboxDir: string): RunCommand {
        // Resolve jest from the app's own node_modules via a filesystem path so
        // the sandbox doesn't need its own. A direct path sidesteps next/
        // webpack's module resolver (which honours package.json#exports and
        // refuses jest/bin/jest.js since it isn't exported).
        const jestBin = path.join(
            process.cwd(),
            "node_modules",
            "jest",
            "bin",
            "jest.js",
        );

        return {
            cmd: process.execPath,
            args: [
                jestBin,
                "--rootDir",
                sandboxDir,
                "--config",
                path.join(sandboxDir, "jest.config.js"),
                "--json",
                "--outputFile",
                path.join(sandboxDir, RESULT_FILE),
                "--colors",
                // Run in the jest process itself - for a single small suite the
                // worker fork/IPC overhead (especially on Windows) dwarfs the
                // test time.
                "--runInBand",
                // Reuse ts-jest's compiled output across runs; the sandbox dir
                // is deleted each time, so the cache must live outside it.
                "--cacheDirectory",
                JEST_CACHE_DIR,
                // Stream each test name live so the terminal shows progress
                // instead of dumping everything at the end.
                "--verbose",
            ],
            env: {
                CI: "true",
                FORCE_COLOR: "1",
            },
        };
    },

    async parseResults(sandboxDir: string): Promise<TestCounts> {
        try {
            const raw = await fs.readFile(
                path.join(sandboxDir, RESULT_FILE),
                "utf-8",
            );
            const parsed = JSON.parse(raw);
            return {
                passed: parsed.numPassedTests ?? 0,
                failed: parsed.numFailedTests ?? 0,
                total: parsed.numTotalTests ?? 0,
            };
        } catch {
            // Jest crashed before writing the result file - stdout/stderr will
            // already have the failure reason.
            return { passed: 0, failed: 0, total: 0 };
        }
    },
};
