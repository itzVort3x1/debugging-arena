import fs from "node:fs";
import path from "node:path";
import type {
  ChallengeDefinition,
  ChallengeFile,
  ChallengeMeta,
  HintLevel,
} from "../../../challenges/_schema";

/**
 * Filesystem-backed loader for challenge definitions.
 *
 * Each challenge lives in /challenges/<slug>/ with this layout:
 *   meta.json
 *   description.md
 *   hints.json   ({ "hints": HintLevel[] })
 *   files/...    editable source files (paths in the sandbox: rel path under files/)
 *   tests/...    read-only test files (paths in the sandbox: "tests/" + rel path)
 *
 * Directories starting with "_" or "." are ignored (so `_schema.ts` is not picked up).
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

function loadEditableFiles(challengeDir: string): ChallengeFile[] {
  const filesDir = path.join(challengeDir, "files");
  if (!fs.existsSync(filesDir)) return [];
  return walkDir(filesDir).map(({ absPath, relPath }) => ({
    path: relPath,
    content: fs.readFileSync(absPath, "utf-8"),
    readOnly: false,
    language: languageFromPath(relPath),
  }));
}

function loadTestFiles(challengeDir: string): ChallengeFile[] {
  const testsDir = path.join(challengeDir, "tests");
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
    throw new Error(
      `Invalid JSON in ${filePath}: ${(err as Error).message}`
    );
  }
}

export function loadChallenge(slug: string): ChallengeDefinition {
  const dir = path.join(CHALLENGES_DIR, slug);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Challenge directory not found: ${slug}`);
  }

  const meta = readJson<ChallengeMeta>(path.join(dir, "meta.json"));
  if (meta.slug !== slug) {
    throw new Error(
      `Challenge slug mismatch: directory "${slug}" but meta.slug is "${meta.slug}"`
    );
  }

  const description = fs.readFileSync(
    path.join(dir, "description.md"),
    "utf-8"
  );

  const { hints } = readJson<{ hints: HintLevel[] }>(
    path.join(dir, "hints.json")
  );

  // Optional: a full worked solution, revealable in the arena for 0 points.
  const solutionPath = path.join(dir, "solution.md");
  const solution = fs.existsSync(solutionPath)
    ? fs.readFileSync(solutionPath, "utf-8")
    : undefined;

  return {
    meta,
    description,
    files: loadEditableFiles(dir),
    testFiles: loadTestFiles(dir),
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
        d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith(".")
    )
    .map((d) => d.name);
}

export function loadAllChallenges(): ChallengeDefinition[] {
  return listChallengeSlugs().map(loadChallenge);
}
