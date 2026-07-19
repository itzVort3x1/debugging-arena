import fs from "node:fs/promises";
import path from "node:path";
import type { ExecEnv, RunCommand } from "../exec/types";
import type { LanguageRunner, TestCounts } from "./types";

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
 * own resolver would fail to find the transformer. The path differs by
 * executor (host node_modules vs the image's), hence it comes from ExecEnv.
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

/** Join a sandbox-relative path onto workDir with forward slashes. */
function inWorkDir(workDir: string, rel: string): string {
    // Forward slashes work for both the container's POSIX /work and Node on
    // Windows (which accepts `/` in paths), so we avoid path.win32/posix
    // branching on the executor.
    return `${workDir}/${rel}`;
}

/**
 * The original jest-based runner, now the first entry in the language
 * registry. Runtime "node" (the default) resolves to this. It runs under
 * either executor: on the host, or inside the arena-node image.
 */
export const nodeRunner: LanguageRunner = {
    image: "arena-node",

    scaffold(_challenge, _fileState, env: ExecEnv) {
        return {
            "jest.config.js": buildJestConfig(
                env.toolPath("node_modules", "ts-jest"),
            ),
            "tsconfig.json": TSCONFIG_CONTENT,
        };
    },

    command(env: ExecEnv, workDir: string): RunCommand {
        // Node itself: the app's own binary on the host, `node` on the image's
        // PATH in a container.
        const nodeExec =
            env.kind === "docker" ? "node" : process.execPath;
        const jestBin = env.toolPath("node_modules", "jest", "bin", "jest.js");
        return {
            cmd: nodeExec,
            args: [
                jestBin,
                "--rootDir",
                workDir,
                "--config",
                inWorkDir(workDir, "jest.config.js"),
                "--json",
                "--outputFile",
                inWorkDir(workDir, RESULT_FILE),
                "--colors",
                // Run in the jest process itself - for a single small suite the
                // worker fork/IPC overhead (especially on Windows) dwarfs the
                // test time.
                "--runInBand",
                // Reuse ts-jest's compiled output across runs; the sandbox dir
                // is deleted each time, so the cache must live outside it.
                "--cacheDirectory",
                env.cacheDir,
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
            // The container bind-mounts sandboxDir at /work, so the result file
            // jest wrote inside it is here on the host too.
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
