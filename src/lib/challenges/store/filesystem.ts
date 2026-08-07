import fs from "node:fs/promises";
import path from "node:path";
import type { ChallengeEntry, ChallengeStore } from "./types";

/**
 * A {@link ChallengeStore} backed by the local `challenges/` directory. The
 * default source for dev and test: fast, offline, and keeps challenges under
 * version control. Store-relative forward-slash paths are mapped onto the OS
 * path separator here.
 */
export class FilesystemStore implements ChallengeStore {
  readonly kind = "filesystem" as const;

  /** Absolute path of the challenges root the store paths are relative to. */
  private readonly root: string;

  constructor(root: string = path.join(process.cwd(), "challenges")) {
    this.root = root;
  }

  /** Resolve a store-relative forward-slash path to an absolute OS path. */
  private resolve(rel: string): string {
    return path.join(this.root, ...rel.split("/").filter(Boolean));
  }

  async readText(rel: string): Promise<string | undefined> {
    try {
      return await fs.readFile(this.resolve(rel), "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw err;
    }
  }

  async list(rel: string): Promise<ChallengeEntry[]> {
    try {
      const entries = await fs.readdir(this.resolve(rel), {
        withFileTypes: true,
      });
      return entries.map((e) => ({ name: e.name, isDir: e.isDirectory() }));
    } catch (err) {
      // A missing directory lists as empty so callers can probe optional dirs.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }
}
