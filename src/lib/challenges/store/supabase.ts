import type { ChallengeEntry, ChallengeStore } from "./types";
import { getSupabaseAdmin, challengeBucket } from "../../supabase";

/** How many objects a single Storage `list` page returns. */
const LIST_PAGE = 100;

/**
 * A {@link ChallengeStore} backed by a private Supabase Storage bucket. Store
 * paths map directly onto object keys under the bucket root. The registry reads
 * challenges from here in prod (`ARENA_CHALLENGE_SOURCE=supabase`), seeded by
 * `scripts/seed-challenges.ts`.
 */
export class SupabaseStore implements ChallengeStore {
  readonly kind = "supabase" as const;

  private readonly bucket: string;

  constructor(bucket: string = challengeBucket()) {
    this.bucket = bucket;
  }

  async readText(path: string): Promise<string | undefined> {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(this.bucket)
      .download(path);
    if (error) {
      if (isNotFound(error)) return undefined;
      throw new Error(
        `Failed to read "${path}" from bucket "${this.bucket}": ${error.message}`,
      );
    }
    return data ? data.text() : undefined;
  }

  async list(path: string): Promise<ChallengeEntry[]> {
    // Storage's list prefix carries no leading/trailing slash; "" is the root.
    const prefix = path.replace(/^\/+|\/+$/g, "");
    const out: ChallengeEntry[] = [];

    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await getSupabaseAdmin()
        .storage.from(this.bucket)
        .list(prefix, {
          limit: LIST_PAGE,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) {
        throw new Error(
          `Failed to list "${prefix}" in bucket "${this.bucket}": ${error.message}`,
        );
      }
      if (!data || data.length === 0) break;
      for (const obj of data) {
        // Supabase returns sub-"folders" (prefixes) as rows with a null id;
        // real objects carry a uuid id.
        out.push({ name: obj.name, isDir: obj.id === null });
      }
      if (data.length < LIST_PAGE) break;
    }
    return out;
  }
}

/** Whether a Storage error means "object doesn't exist" vs a real failure. */
function isNotFound(error: unknown): boolean {
  const e = error as { message?: string; status?: number; statusCode?: string };
  const status = e.status ?? Number(e.statusCode);
  if (status === 404 || status === 400) return true;
  return /not.?found|does not exist|no such/i.test(e.message ?? "");
}
