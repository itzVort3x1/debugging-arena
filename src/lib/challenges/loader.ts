import fs from "node:fs";
import path from "node:path";
import {
  RUNTIMES,
  type ChallengeDefinition,
  type ChallengeFile,
  type ChallengeMeta,
  type HintLevel,
  type Runtime,
} from "../../../challenges/_schema";

/**
 * Filesystem-backed loader for challenge definitions.
 *
 * Single-language challenge (legacy layout) — /challenges/<slug>/:
 *   meta.json
 *   description.md
 *   hints.json   ({ "hints": HintLevel[] })
 *   files/...    editable source files (sandbox path: rel path under files/)
 *   tests/...    read-only test files (sandbox path: "tests/" + rel path)
 *
 * Multi-language challenge — /challenges/<slug>/:
 *   meta.json          shared (may set "languages" + "defaultLanguage")
 *   description.md      shared
 *   <lang>/            one per language (node/, python/, …), each holding
 *     files/ tests/ hints.json solution.md
 *   hints.json          optional shared fallback used by a variant with none
 *   solution.md         optional shared fallback
 *
 * A challenge is treated as multi-language iff it has at least one runtime-named
 * subdir (node/, python/, …) containing files/ or tests/. Otherwise it's the
 * legacy single-language layout and loads exactly as before.
 *
 * Directories starting with "_" or "." are ignored (so `_schema.ts` and test
 * fixtures are not picked up by the registry).
 */

const CHALLENGES_DIR = path.join(process.cwd(), "challenges");

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".md": "markdown",
  ".html": "html",
  ".css": "css",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

function languageFromPath(filePath: string): string {
  return EXT_TO_LANGUAGE[path.extname(filePath).toLowerCase()] ?? "plaintext";
}

interface WalkedFile {
  absPath: string;
  /** Path relative to the walk root, using forward slashes. */
  relPath: string;
}

function walkDir(root: string): WalkedFile[] {
  const out: WalkedFile[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        out.push({
          absPath: abs,
          relPath: path.relative(root, abs).split(path.sep).join("/"),
        });
      }
    }
  }
  return out;
}

/** Editable source files, read from `<variantRoot>/files`. */
function loadEditableFiles(variantRoot: string): ChallengeFile[] {
  const filesDir = path.join(variantRoot, "files");
  if (!fs.existsSync(filesDir)) return [];
  return walkDir(filesDir).map(({ absPath, relPath }) => ({
    path: relPath,
    content: fs.readFileSync(absPath, "utf-8"),
    readOnly: false,
    language: languageFromPath(relPath),
  }));
}

/** Read-only test files, read from `<variantRoot>/tests`. */
function loadTestFiles(variantRoot: string): ChallengeFile[] {
  const testsDir = path.join(variantRoot, "tests");
  if (!fs.existsSync(testsDir)) return [];
  return walkDir(testsDir).map(({ absPath, relPath }) => ({
    path: "tests/" + relPath,
    content: fs.readFileSync(absPath, "utf-8"),
    readOnly: true,
    language: languageFromPath(relPath),
  }));
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${(err as Error).message}`);
  }
}

function isDir(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

/** True if `<dir>/<runtime>` holds a variant (has a files/ or tests/ subdir). */
function hasVariantDir(dir: string, runtime: Runtime): boolean {
  const variant = path.join(dir, runtime);
  return (
    isDir(variant) &&
    (isDir(path.join(variant, "files")) || isDir(path.join(variant, "tests")))
  );
}

/**
 * Resolve the languages a challenge offers and which one is the default.
 * Multi-language: the runtime-named subdirs present (ordered by meta.languages
 * if the author fixed an order). Legacy: the single `meta.runtime` (or node).
 */
function resolveLanguages(
  dir: string,
  meta: ChallengeMeta,
): { languages: Runtime[]; defaultLanguage: Runtime } {
  const discovered = RUNTIMES.filter((r) => hasVariantDir(dir, r));

  let languages: Runtime[];
  if (discovered.length > 0) {
    // Honour an author-declared ordering, but only for variants that exist.
    languages = meta.languages?.filter((l) => discovered.includes(l)) ?? [];
    for (const r of discovered) if (!languages.includes(r)) languages.push(r);
  } else {
    languages = [meta.runtime ?? "node"];
  }

  const defaultLanguage =
    meta.defaultLanguage && languages.includes(meta.defaultLanguage)
      ? meta.defaultLanguage
      : languages[0];

  return { languages, defaultLanguage };
}

/** Read a file if it exists at the variant root, else fall back to the shared root. */
function readWithFallback(
  variantRoot: string,
  dir: string,
  name: string,
): string | undefined {
  const atVariant = path.join(variantRoot, name);
  if (fs.existsSync(atVariant)) return fs.readFileSync(atVariant, "utf-8");
  const atShared = path.join(dir, name);
  if (fs.existsSync(atShared)) return fs.readFileSync(atShared, "utf-8");
  return undefined;
}

/**
 * The languages a challenge can be solved in, cheaply (reads meta + dir
 * structure only, not the files/tests).
 */
export function listChallengeLanguages(slug: string): Runtime[] {
  const dir = path.join(CHALLENGES_DIR, slug);
  if (!isDir(dir)) {
    throw new Error(`Challenge directory not found: ${slug}`);
  }
  const meta = readJson<ChallengeMeta>(path.join(dir, "meta.json"));
  return resolveLanguages(dir, meta).languages;
}

/**
 * Load a challenge for a specific language (defaults to its `defaultLanguage`).
 * The returned `meta` always carries the resolved `runtime`, `languages`, and
 * `defaultLanguage`, so callers see a uniform shape for single- and
 * multi-language challenges alike.
 */
export function loadChallenge(
  slug: string,
  language?: Runtime,
): ChallengeDefinition {
  const dir = path.join(CHALLENGES_DIR, slug);
  if (!isDir(dir)) {
    throw new Error(`Challenge directory not found: ${slug}`);
  }

  const meta = readJson<ChallengeMeta>(path.join(dir, "meta.json"));
  if (meta.slug !== slug) {
    throw new Error(
      `Challenge slug mismatch: directory "${slug}" but meta.slug is "${meta.slug}"`,
    );
  }

  const { languages, defaultLanguage } = resolveLanguages(dir, meta);
  const runtime = language ?? defaultLanguage;
  if (!languages.includes(runtime)) {
    throw new Error(
      `Challenge "${slug}" has no "${runtime}" variant (has: ${languages.join(", ")}).`,
    );
  }

  // Multi-language variants live in <dir>/<runtime>; legacy files sit at <dir>.
  const isMultiLanguage = languages.length > 1 || hasVariantDir(dir, runtime);
  const variantRoot = isMultiLanguage ? path.join(dir, runtime) : dir;

  // description.md is shared across variants (top-level).
  const description = fs.readFileSync(path.join(dir, "description.md"), "utf-8");

  const hintsRaw = readWithFallback(variantRoot, dir, "hints.json");
  let hints: HintLevel[] = [];
  if (hintsRaw) {
    try {
      hints = (JSON.parse(hintsRaw) as { hints: HintLevel[] }).hints ?? [];
    } catch (err) {
      throw new Error(
        `Invalid JSON in hints.json for "${slug}": ${(err as Error).message}`,
      );
    }
  }

  const solution = readWithFallback(variantRoot, dir, "solution.md");

  return {
    meta: { ...meta, runtime, languages, defaultLanguage },
    description,
    files: loadEditableFiles(variantRoot),
    testFiles: loadTestFiles(variantRoot),
    hints,
    solution,
  };
}

export function listChallengeSlugs(): string[] {
  if (!fs.existsSync(CHALLENGES_DIR)) return [];
  return fs
    .readdirSync(CHALLENGES_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."),
    )
    .map((d) => d.name);
}

/** Every challenge's default variant (used for listings). */
export function loadAllChallenges(): ChallengeDefinition[] {
  return listChallengeSlugs().map((slug) => loadChallenge(slug));
}
