import { prisma } from "../prisma";
import { invalidateChallengeCache } from "./registry";
import { validateChallengeTree, type ChallengeValidation } from "./validate";
import { asTree, type ChallengeTree } from "./store/tree";

/**
 * The admin-side view of challenges: reads and writes the `Challenge` table
 * directly rather than going through `ChallengeStore`.
 *
 * The store deliberately only exposes PUBLISHED challenges, because that is
 * what the app should ever see. Admins need drafts too, so this is the one
 * module allowed to bypass it.
 */

export type ChallengeStatus = "DRAFT" | "PUBLISHED";

export interface AdminChallengeListItem {
  slug: string;
  title: string;
  difficulty: string;
  languages: string[];
  status: string;
  version: number;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface AdminChallengeDetail extends AdminChallengeListItem {
  content: ChallengeTree;
}

/** Every challenge, draft and published, newest edit first. */
export async function listChallengesForAdmin(): Promise<
  AdminChallengeListItem[]
> {
  return prisma.challenge.findMany({
    select: {
      slug: true,
      title: true,
      difficulty: true,
      languages: true,
      status: true,
      version: true,
      updatedAt: true,
      publishedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** One challenge with its full file tree, or null when the slug is unknown. */
export async function getChallengeForAdmin(
  slug: string,
): Promise<AdminChallengeDetail | null> {
  const row = await prisma.challenge.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      difficulty: true,
      languages: true,
      status: true,
      version: true,
      updatedAt: true,
      publishedAt: true,
      content: true,
    },
  });
  if (!row) return null;
  return { ...row, content: asTree(row.content) };
}

export interface ChallengeVersionSummary {
  version: number;
  createdAt: Date;
  note: string | null;
  /** Author's email, or null when unknown (imported, or the user was deleted). */
  authorEmail: string | null;
}

/**
 * A challenge's published history, newest first.
 *
 * `ChallengeVersion.createdById` is deliberately not a foreign key (see the
 * migration), so the author is resolved with a second lookup and degrades to
 * null rather than breaking the list when a user no longer exists.
 */
export async function listChallengeVersions(
  slug: string,
): Promise<ChallengeVersionSummary[]> {
  const rows = await prisma.challengeVersion.findMany({
    where: { challengeSlug: slug },
    select: { version: true, createdAt: true, note: true, createdById: true },
    orderBy: { version: "desc" },
  });

  const authorIds = Array.from(
    new Set(rows.map((r) => r.createdById).filter((id): id is string => !!id)),
  );
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailById = new Map(authors.map((a) => [a.id, a.email]));

  return rows.map((r) => ({
    version: r.version,
    createdAt: r.createdAt,
    note: r.note,
    authorEmail: r.createdById ? (emailById.get(r.createdById) ?? null) : null,
  }));
}

export interface ChallengeVersionDetail extends ChallengeVersionSummary {
  content: ChallengeTree;
}

/** One snapshot with its full tree, or null when that version doesn't exist. */
export async function getChallengeVersion(
  slug: string,
  version: number,
): Promise<ChallengeVersionDetail | null> {
  const row = await prisma.challengeVersion.findUnique({
    where: { challengeSlug_version: { challengeSlug: slug, version } },
    select: {
      version: true,
      createdAt: true,
      note: true,
      createdById: true,
      content: true,
    },
  });
  if (!row) return null;

  const author = row.createdById
    ? await prisma.user.findUnique({
        where: { id: row.createdById },
        select: { email: true },
      })
    : null;

  return {
    version: row.version,
    createdAt: row.createdAt,
    note: row.note,
    authorEmail: author?.email ?? null,
    content: asTree(row.content),
  };
}

export interface CreateChallengeInput {
  slug: string;
  tree: ChallengeTree;
  /** Author, recorded on the first version snapshot. */
  userId: string;
}

export type CreateChallengeResult =
  | { created: true }
  | { created: false; reason: "taken" | "invalid"; errors: string[] };

/**
 * Create a challenge from a scaffolded tree, always as a DRAFT.
 *
 * The tree must validate: unlike an edit, there is no earlier good version to
 * fall back on, and the meta projection columns are NOT NULL — an unparseable
 * `meta.json` leaves nothing to write into them. The scaffold always validates,
 * so this only rejects a hand-crafted request.
 *
 * No cache invalidation: a draft is not in the published set, so nothing the
 * app can see has changed.
 */
export async function createChallenge(
  input: CreateChallengeInput,
): Promise<CreateChallengeResult> {
  const { slug, tree, userId } = input;

  const validation = await validateChallengeTree(slug, tree);
  if (!validation.ok || !validation.summary) {
    return { created: false, reason: "invalid", errors: validation.errors };
  }

  const { summary } = validation;
  try {
    await prisma.challenge.create({
      data: {
        slug,
        title: summary.meta.title,
        difficulty: summary.meta.difficulty,
        tags: summary.meta.tags,
        timeLimit: summary.meta.timeLimit,
        stack: summary.meta.stack,
        issueContext: summary.meta.issueContext,
        languages: summary.languages,
        defaultLanguage: summary.defaultLanguage,
        content: tree,
        status: "DRAFT",
        version: 1,
        versions: {
          create: {
            version: 1,
            content: tree,
            meta: {
              title: summary.meta.title,
              difficulty: summary.meta.difficulty,
              tags: summary.meta.tags,
              timeLimit: summary.meta.timeLimit,
              stack: summary.meta.stack,
              issueContext: summary.meta.issueContext,
              languages: summary.languages,
              defaultLanguage: summary.defaultLanguage,
            },
            createdById: userId,
            note: "Created from scaffold",
          },
        },
      },
    });
  } catch (err) {
    // Unique violation on the primary key — the slug was taken, possibly
    // between the caller's check and this insert.
    if (isUniqueViolation(err)) {
      return { created: false, reason: "taken", errors: [] };
    }
    throw err;
  }

  return { created: true };
}

/** Prisma's unique-constraint error, without importing the error class. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

export interface SaveChallengeInput {
  slug: string;
  tree: ChallengeTree;
  status: ChallengeStatus;
  /** Author, recorded on the version snapshot. */
  userId: string;
  note?: string;
}

export interface SaveChallengeResult {
  saved: boolean;
  validation: ChallengeValidation;
  version: number;
  status: ChallengeStatus;
}

/**
 * Persist an edited challenge.
 *
 * Publishing is gated on validation: a tree that fails to load is refused,
 * because publishing it would break the challenge for every user. A DRAFT may
 * be saved while invalid — it is not served to anyone, and forcing an author to
 * fix everything before they can save a work in progress would just push them
 * to author outside the tool. The validation result comes back either way so
 * the editor can show the problems.
 *
 * Version and snapshot advance only when the result is PUBLISHED. Drafts are a
 * scratchpad; history tracks what was actually live, which is what a rollback
 * would ever want to return to.
 *
 * The meta projection columns are rewritten in the SAME transaction as
 * `content`, from the summary the validator resolved — that is what keeps them
 * from drifting. When an invalid draft is saved there is no summary to project,
 * so the previous column values are left in place; they describe a version that
 * is no longer the working copy, but nothing reads them for a draft.
 */
export async function saveChallenge(
  input: SaveChallengeInput,
): Promise<SaveChallengeResult> {
  const { slug, tree, status, userId, note } = input;

  const validation = await validateChallengeTree(slug, tree);
  if (status === "PUBLISHED" && !validation.ok) {
    return { saved: false, validation, version: 0, status };
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.challenge.findUnique({
      where: { slug },
      select: { version: true, publishedAt: true },
    });
    if (!existing) throw new Error(`Unknown challenge "${slug}"`);

    const publishing = status === "PUBLISHED";
    const version = publishing ? existing.version + 1 : existing.version;
    const now = new Date();

    // Only a resolved summary can produce the projection; an invalid draft
    // keeps whatever the columns already held.
    const meta = validation.summary
      ? {
          title: validation.summary.meta.title,
          difficulty: validation.summary.meta.difficulty,
          tags: validation.summary.meta.tags,
          timeLimit: validation.summary.meta.timeLimit,
          stack: validation.summary.meta.stack,
          issueContext: validation.summary.meta.issueContext,
          languages: validation.summary.languages,
          defaultLanguage: validation.summary.defaultLanguage,
        }
      : {};

    await tx.challenge.update({
      where: { slug },
      data: {
        ...meta,
        content: tree,
        status,
        version,
        ...(publishing ? { publishedAt: existing.publishedAt ?? now } : {}),
      },
    });

    if (publishing) {
      await tx.challengeVersion.create({
        data: {
          challengeSlug: slug,
          version,
          content: tree,
          meta,
          createdById: userId,
          note: note ?? null,
        },
      });
    }

    return { version, status };
  });

  // Published content changed, or a challenge just left/entered the published
  // set — either way this instance's cached view is stale.
  invalidateChallengeCache();

  return { saved: true, validation, ...result };
}
