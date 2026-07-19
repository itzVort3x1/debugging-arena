import fs from "node:fs/promises";
import path from "node:path";
import { parseJUnitCounts } from "../junit";
import type { ExecEnv, RunCommand } from "../exec/types";
import type { LanguageRunner, TestCounts } from "./types";

/** pytest's JUnit report, written here and read back by parseResults. */
const RESULT_FILE = ".pytest-result.xml";

/**
 * Minimal pytest config. `pythonpath = .` puts the sandbox root on sys.path so
 * the tests (materialized under tests/) can import the editable module (which
 * is materialized at the sandbox root) — without it, pytest's default import
 * mode would only add the tests/ dir.
 */
const PYTEST_INI = `[pytest]
pythonpath = .
`;

/**
 * Runs a challenge's pytest suite and normalizes its JUnit XML into counts.
 * Selected when a challenge's meta.runtime is "python". Runs in the
 * arena-python image; host mode would require pytest on the host's PATH.
 */
export const pythonRunner: LanguageRunner = {
    image: "arena-python",

    scaffold() {
        return { "pytest.ini": PYTEST_INI };
    },

    command(env: ExecEnv, workDir: string): RunCommand {
        return {
            cmd: "pytest",
            args: [
                "tests",
                "-v",
                "--color=yes",
                // Emit JUnit XML into the sandbox (bind-mounted), read back on
                // the host by parseResults.
                "--junitxml",
                `${workDir}/${RESULT_FILE}`,
                // Keep pytest's own cache off the bind-mounted sandbox and on
                // the persistent cache dir.
                "-o",
                `cache_dir=${env.cacheDir}/pytest`,
            ],
            env: {
                // Force color despite no TTY, matching the node runner's feel.
                PY_COLORS: "1",
            },
        };
    },

    async parseResults(sandboxDir: string): Promise<TestCounts> {
        try {
            const xml = await fs.readFile(
                path.join(sandboxDir, RESULT_FILE),
                "utf-8",
            );
            return parseJUnitCounts(xml);
        } catch {
            // pytest crashed before writing the report (e.g. a collection or
            // import error) - stdout/stderr already carry the reason.
            return { passed: 0, failed: 0, total: 0 };
        }
    },
};
