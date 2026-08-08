import { ArenaSkeleton } from "@/components/ide/ArenaSkeleton";

/**
 * Shown the instant a challenge link is clicked, while the server resolves the
 * challenge and the user's pinned version. The same skeleton then carries
 * through the client's session fetch (see ArenaPageClient), so the two waits
 * read as one.
 */
export default function ArenaLoading() {
    return <ArenaSkeleton />;
}
