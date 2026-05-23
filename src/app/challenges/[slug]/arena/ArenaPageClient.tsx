"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { ChallengeDefinition } from "../../../../../challenges/_schema";
import { useArenaStore } from "@/store/arena";
import { useSession } from "@/hooks/useSession";
import { ArenaLayout } from "@/components/ide/ArenaLayout";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

interface ArenaPageClientProps {
  challenge: ChallengeDefinition;
}

/**
 * Hydrates the store with the challenge (passed from the server) and
 * resolves the user's session via /api/sessions. Renders ArenaLayout
 * once both are in place.
 */
export function ArenaPageClient({ challenge }: ArenaPageClientProps) {
  const setChallenge = useArenaStore((s) => s.setChallenge);
  const reset = useArenaStore((s) => s.reset);

  // Challenge has to be in the store before useSession triggers
  // setSession, so the first open tab seeds from the editable file list.
  useEffect(() => {
    setChallenge(challenge);
    return () => reset();
  }, [challenge, setChallenge, reset]);

  const { session, isLoading, error } = useSession(challenge.meta.slug);

  if (error) {
    return (
      <FullScreen>
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-lg font-semibold text-vscode-error">
            Couldn&apos;t start the session
          </h1>
          <p className="mb-6 text-sm text-vscode-fg-muted">{error}</p>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Back to challenges
            </Button>
          </Link>
        </div>
      </FullScreen>
    );
  }

  if (isLoading || !session) {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3 text-vscode-fg-muted">
          <Spinner size="lg" />
          <p className="text-sm">Loading {challenge.meta.title}…</p>
        </div>
      </FullScreen>
    );
  }

  return <ArenaLayout />;
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-vscode-bg p-6 text-vscode-fg">
      {children}
    </div>
  );
}
