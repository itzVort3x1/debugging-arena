import type { Runtime } from "../../../../challenges/_schema";
import type { LanguageRunner } from "./types";
import { nodeRunner } from "./node";
import { pythonRunner } from "./python";

/**
 * Runtime → LanguageRunner. Adding a language is a new entry here plus its
 * runner module and image (see MULTI_LANGUAGE_PLAN). go/rust remain declared
 * in the Runtime union but unimplemented — getRunner throws for those.
 */
const RUNNERS: Partial<Record<Runtime, LanguageRunner>> = {
    node: nodeRunner,
    python: pythonRunner,
};

/** Runtime used when a challenge's meta omits `runtime`. */
export const DEFAULT_RUNTIME: Runtime = "node";

/**
 * Resolve the runner for a challenge's declared runtime, defaulting to
 * "node" when unset. Throws for a declared-but-unimplemented runtime so a
 * misconfigured challenge fails loudly rather than silently running nothing.
 */
export function getRunner(runtime: Runtime = DEFAULT_RUNTIME): LanguageRunner {
    const runner = RUNNERS[runtime];
    if (!runner) {
        throw new Error(
            `No runner registered for runtime "${runtime}". ` +
                `Supported: ${Object.keys(RUNNERS).join(", ")}.`,
        );
    }
    return runner;
}
