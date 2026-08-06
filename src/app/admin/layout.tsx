import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Gate for everything under /admin. Non-admins get a 404 rather than a redirect
 * or a 403, so the admin surface never confirms it exists — the same reasoning
 * as `requireAdmin` on the API side.
 *
 * This guards the pages; each API route guards itself. Neither relies on the
 * other, because a layout is not a security boundary for direct fetches.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminId = await getAdminUserId();
  if (!adminId) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-vscode-bg text-vscode-fg">
      <header className="flex items-center gap-4 border-b border-vscode-border px-6 py-3">
        <Link href="/admin/challenges" className="text-sm font-semibold">
          Admin
        </Link>
        <nav className="flex items-center gap-3 text-xs text-vscode-fg-muted">
          <Link href="/admin/challenges" className="hover:text-vscode-fg">
            Challenges
          </Link>
        </nav>
        <Link
          href="/dashboard"
          className="ml-auto text-xs text-vscode-fg-muted hover:text-vscode-fg"
        >
          Back to app
        </Link>
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
