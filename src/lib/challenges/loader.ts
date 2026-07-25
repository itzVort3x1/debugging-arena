import {
  RUNTIMES,
  type ChallengeDefinition,
  type ChallengeFile,
  type ChallengeMeta,
  type HintLevel,
  type Runtime,
} from "../../../challenges/_schema";
import type { ChallengeStore } from "./store/types";

/**
 * Store-backed loader for challenge definitions. Reads every file through a
 * {@link ChallengeStore} (local filesystem, or a remote store later), so the
 * layout logic below is source-agnostic. All paths are store-relative and use
 * forward slashes; the store maps them onto its own root.
 *
 * A challenge lives under a root path (`<slug>` today; `<difficulty>/<slug>`
 * once the cloud layout lands) with this shape:
 *
 * Single-language (legacy) — <root>/:
 *   meta.json
 *   description.md
 *   hints.json   ({ "hints": HintLevel[] })
 *   files/...    editable source files (sandbox path: rel path under files/)
 *   tests/...    read-only test files (sandbox path: "tests/" + rel path)
 *
 * Multi-language — <root>/:
 *   meta.json          shared (may set "languages" + "defaultLanguage")
 *   description.md      shared
 *   <lang>/            one per language (node/, python/, …), each holding
 *     files/ tests/ hints.json solution.md
 *   hints.json          optional shared fallback used by a variant with none
 *   solution.md         optional shared fallback
 *
 * A challenge is multi-language iff it has at least one runtime-named subdir
 * (node/, python/, …) containing files/ or tests/; otherwise it's the legacy
 * single-language layout and loads exactly as before.
 *
 * Directories starting with "_" or "." are ignored (so `_schema.ts` and test
 * fixtures are not picked up by the registry).
 */

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

function extname(p: string): string {
  const dot = p.lastIndexOf(".");
  const slash = p.lastIndexOf("/");
  return dot > slash ? p.slice(dot).toLowerCase() : "";
}

function languageFromPath(filePath: string): string {
  return EXT_TO_LANGUAGE[extname(filePath)] ?? "plaintext";
}

/** Join store-relative segments with forward slashes, skipping empties. */
function join(...segments: string[]): string {
  return segments.filter(Boolean).join("/");
}

/**
 * Recursively collect file paths under `root`, relative to `root` (forward
 * slashes). A missing `root` yields `[]`.
 */
async function walk(store: ChallengeStore, root: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [""]; // sub-paths relative to root
  while (stack.length) {
    const rel = stack.pop()!;
    const entries = await store.list(join(root, rel));
    for (const entry of entries) {
      const childRel = join(rel, entry.name);
      if (entry.isDir) stack.push(childRel);
      else out.push(childRel);
    }
  }
  return out;
}

/** Editable source files, read from `<variantRoot>/files`. */
async function loadEditableFiles(
  store: ChallengeStore,
  variantRoot: string,
): Promise<ChallengeFile[]> {
  const filesRoot = join(variantRoot, "files");
  const rels = await walk(store, filesRoot);
  return Promise.all(
    rels.map(async (rel) => ({
      path: rel,
      content: (await store.readText(join(filesRoot, rel))) ?? "",
      readOnly: false,
      language: languageFromPath(rel),
    })),
  );
}

/** Read-only test files, read from `<variantRoot>/tests`. */
async function loadTestFiles(
  store: ChallengeStore,
  variantRoot: string,
): Promise<ChallengeFile[]> {
  const testsRoot = join(variantRoot, "tests");
  const rels = await walk(store, testsRoot);
  return Promise.all(
    rels.map(async (rel) => ({
      path: "tests/" + rel,
      content: (await store.readText(join(testsRoot, rel))) ?? "",
      readOnly: true,
      language: languageFromPath(rel),
    })),
  );
}

async function readJson<T>(store: ChallengeStore, path: string): Promise<T> {
  const raw = await store.readText(path);
  if (raw === undefined) throw new Error(`Challenge file not found: ${path}`);
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Invalid JSON in ${path}: ${(err as Error).message}`);
  }
}

/** True if `<dir>/<runtime>` holds a variant (has a files/ or tests/ subdir). */
async function hasVariantDir(
  store: ChallengeStore,
  dir: string,
  runtime: Runtime,
): Promise<boolean> {
  const entries = await store.list(join(dir, runtime));
  return entries.some(
    (e) => e.isDir && (e.name === "files" || e.name === "tests"),
  );
}

/**
 * Resolve the languages a challenge offers and which one is the default.
 * Multi-language: the runtime-named subdirs present (ordered by meta.languages
 * if the author fixed an order). Legacy: the single `meta.runtime` (or node).
 */
async function resolveLanguages(
  store: ChallengeStore,
  root: string,
  meta: ChallengeMeta,
): Promise<{ languages: Runtime[]; defaultLanguage: Runtime }> {
  const discovered: Runtime[] = [];
  for (const r of RUNTIMES) {
    if (await hasVariantDir(store, root, r)) discovered.push(r);
  }

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

/** Read a file at the variant root, else fall back to the shared root. */
async function readWithFallback(
  store: ChallengeStore,
  variantRoot: string,
  root: string,
  name: string,
): Promise<string | undefined> {
  const atVariant = await store.readText(join(variantRoot, name));
  if (atVariant !== undefined) return atVariant;
  return store.readText(join(root, name));
}

/** The trailing path segment of a challenge root is its slug. */
function slugOf(root: string): string {
  return root.split("/").filter(Boolean).pop() ?? root;
}

/** Read + resolve a challenge's meta and language set (no files/tests). */
async function loadMeta(
  store: ChallengeStore,
  root: string,
): Promise<{ meta: ChallengeMeta; languages: Runtime[]; defaultLanguage: Runtime }> {
  const slug = slugOf(root);
  const meta = await readJson<ChallengeMeta>(store, join(root, "meta.json"));
  if (meta.slug !== slug) {
    throw new Error(
      `Challenge slug mismatch: path "${root}" but meta.slug is "${meta.slug}"`,
    );
  }
  const { languages, defaultLanguage } = await resolveLanguages(
    store,
    root,
    meta,
  );
  return { meta, languages, defaultLanguage };
}

/**
 * A challenge's resolved summary: its language set + a `ChallengeMeta` carrying
 * the resolved `runtime` (= defaultLanguage), `languages`, and
 * `defaultLanguage`. Cheap — reads meta + dir structure only, not files/tests.
 * Backs the registry's meta tier.
 */
export interface ChallengeSummary {
  slug: string;
  languages: Runtime[];
  defaultLanguage: Runtime;
  meta: ChallengeMeta;
}

export async function loadChallengeSummary(
  store: ChallengeStore,
  root: string,
): Promise<ChallengeSummary> {
  const { meta, languages, defaultLanguage } = await loadMeta(store, root);
  return {
    slug: meta.slug,
    languages,
    defaultLanguage,
    meta: { ...meta, runtime: defaultLanguage, languages, defaultLanguage },
  };
}

/**
 * Load a challenge for a specific language (defaults to its `defaultLanguage`).
 * The returned `meta` always carries the resolved `runtime`, `languages`, and
 * `defaultLanguage`, so callers see a uniform shape for single- and
 * multi-language challenges alike. `root` is the challenge's store-relative
 * root path (`<slug>` today).
 */
export async function loadChallenge(
  store: ChallengeStore,
  root: string,
  language?: Runtime,
): Promise<ChallengeDefinition> {
  const slug = slugOf(root);
  const { meta, languages, defaultLanguage } = await loadMeta(store, root);

  const runtime = language ?? defaultLanguage;
  if (!languages.includes(runtime)) {
    throw new Error(
      `Challenge "${slug}" has no "${runtime}" variant (has: ${languages.join(", ")}).`,
    );
  }

  // Multi-language variants live in <root>/<runtime>; legacy files sit at <root>.
  const isMultiLanguage =
    languages.length > 1 || (await hasVariantDir(store, root, runtime));
  const variantRoot = isMultiLanguage ? join(root, runtime) : root;

  // description.md is shared across variants (top-level).
  const description = await store.readText(join(root, "description.md"));
  if (description === undefined) {
    throw new Error(`Challenge file not found: ${join(root, "description.md")}`);
  }

  const hintsRaw = await readWithFallback(store, variantRoot, root, "hints.json");
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

  const solution = await readWithFallback(
    store,
    variantRoot,
    root,
    "solution.md",
  );

  const [files, testFiles] = await Promise.all([
    loadEditableFiles(store, variantRoot),
    loadTestFiles(store, variantRoot),
  ]);

  return {
    meta: { ...meta, runtime, languages, defaultLanguage },
    description,
    files,
    testFiles,
    hints,
    solution,
  };
}

/**
 * The store-relative root path of every challenge. Today the challenges live
 * flat under the store root (root === slug); directories starting with "_" or
 * "." are ignored. (Replaced by a manifest read once the cloud layout lands.)
 */
export async function listChallengeRoots(
  store: ChallengeStore,
): Promise<string[]> {
  const entries = await store.list("");
  return entries
    .filter(
      (e) => e.isDir && !e.name.startsWith("_") && !e.name.startsWith("."),
    )
    .map((e) => e.name);
}
