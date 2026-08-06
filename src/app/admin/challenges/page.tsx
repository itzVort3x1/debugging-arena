import Link from "next/link";
import { ChallengeStatusBadge } from "@/components/admin/ChallengeStatusBadge";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { listChallengesForAdmin } from "@/lib/challenges/admin";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  const challenges = await listChallengesForAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-start gap-4">
        <div>
          <h1 className="text-lg font-semibold">Challenges</h1>
          <p className="mt-1 text-xs text-vscode-fg-muted">
            Published challenges are live in the arena. Drafts are visible only
            here.
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="ml-auto shrink-0 rounded-md bg-vscode-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-vscode-accent-hover"
        >
          New challenge
        </Link>
      </div>

      {challenges.length === 0 ? (
        <EmptyState className="p-8 text-sm">
          No challenges yet. Import the repo tree with
          <code className="mx-1">scripts/import-challenges-to-db.ts</code>.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-vscode-border-subtle rounded-md border border-vscode-border">
          {challenges.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/admin/challenges/${c.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-vscode-tab-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.title}
                    </span>
                    <ChallengeStatusBadge status={c.status} />
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-vscode-fg-subtle">
                    {c.slug} · v{c.version} · edited{" "}
                    {formatRelativeTime(c.updatedAt)}
                  </div>
                </div>
                <DifficultyBadge level={c.difficulty} />
                <span className="text-[11px] text-vscode-fg-subtle">
                  {c.languages.join(", ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
