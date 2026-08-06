import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, requireAdmin } from "@/lib/api/guards";
import { HttpError, route } from "@/lib/api/http";
import {
  getChallengeForAdmin,
  saveChallenge,
} from "@/lib/challenges/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin read/write for one challenge.
 *
 * Note the sibling `revalidate/` route: Next.js matches static segments before
 * dynamic ones, so a challenge whose slug is literally "revalidate" would be
 * unreachable here. Not worth designing around, but worth knowing.
 */

/**
 * Guard rails on tree size. A challenge is a handful of small text files; the
 * whole existing corpus is ~100 KB. These exist so a runaway or hostile client
 * cannot push an unbounded blob into a jsonb column.
 */
const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

const saveSchema = z.object({
  content: z.record(z.string(), z.string()),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  note: z.string().max(500).optional(),
});

type Ctx = { params: { slug: string } };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireAdmin();
  const challenge = await getChallengeForAdmin(params.slug);
  if (!challenge) throw new HttpError(404, "Not found");
  return NextResponse.json({ challenge });
});

/**
 * PUT /api/admin/challenges/[slug]
 *
 * Saves the edited file tree. Publishing requires the tree to validate;
 * a draft may be saved while invalid so work in progress isn't lost. Either
 * way the validation result comes back for the editor to display.
 */
export const PUT = route<Ctx>(async (req, { params }) => {
  const userId = await requireAdmin();
  const body = await parseJsonBody(req, saveSchema);

  const paths = Object.keys(body.content);
  if (paths.length === 0) {
    throw new HttpError(400, "A challenge must have at least one file");
  }
  if (paths.length > MAX_FILES) {
    throw new HttpError(400, `Too many files (max ${MAX_FILES})`);
  }
  const totalBytes = Object.values(body.content).reduce(
    (sum, text) => sum + Buffer.byteLength(text, "utf8"),
    0,
  );
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new HttpError(
      400,
      `Challenge is too large (${totalBytes} bytes, max ${MAX_TOTAL_BYTES})`,
    );
  }

  const existing = await getChallengeForAdmin(params.slug);
  if (!existing) throw new HttpError(404, "Not found");

  const result = await saveChallenge({
    slug: params.slug,
    tree: body.content,
    status: body.status,
    userId,
    note: body.note,
  });

  // A refused publish is the client's problem to fix, not a server error.
  if (!result.saved) {
    throw new HttpError(400, "Challenge is not valid and cannot be published", {
      errors: result.validation.errors,
    });
  }

  return NextResponse.json({
    ok: true,
    version: result.version,
    status: result.status,
    errors: result.validation.errors,
  });
});
