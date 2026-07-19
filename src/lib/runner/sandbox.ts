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

/**
 * Materialize a working copy of a challenge into a fresh temp directory:
 *
 *   - `fileState`            → editable working files (user's edits)
 *   - `challenge.testFiles`  → read-only tests (from the challenge spec)
 *   - `scaffoldFiles`        → runtime-specific config (jest.config.js,
 *                              tsconfig.json, requirements.txt, …), provided
 *                              by the LanguageRunner for this challenge.
 *
 * Test and scaffold files are written AFTER fileState so they cannot be
 * overwritten by a malformed fileState that includes a colliding key (e.g. a
 * `tests/...` path or a `jest.config.js`).
 */
export async function materializeSandbox(
    challenge: ChallengeDefinition,
    fileState: Record<string, string>,
    scaffoldFiles: Record<string, string> = {},
): Promise<Sandbox> {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "arena-run-"));

    for (const [relPath, content] of Object.entries(fileState)) {
        await writeRelative(cwd, relPath, content);
    }
    for (const f of challenge.testFiles) {
        await writeRelative(cwd, f.path, f.content);
    }
    for (const [relPath, content] of Object.entries(scaffoldFiles)) {
        await writeRelative(cwd, relPath, content);
    }

    return {
        cwd,
        cleanup: () => fs.rm(cwd, { recursive: true, force: true }),
    };
}

async function writeRelative(
    root: string,
    relPath: string,
    content: string,
): Promise<void> {
    const abs = path.join(root, relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf-8");
}
