"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import type { DebugSessionResponse } from "@/types/session";

interface ScoreBreakdown {
    score: number;
    base: number;
    hintPenalty: number;
    attemptPenalty: number;
    timeAdjustment: number;
}

interface SubmitSuccess {
    session: DebugSessionResponse;
    breakdown: ScoreBreakdown;
}

/**
 * Finalizes the session. Enabled only when the last run was fully green
 * (a cheap client gate) - the server re-runs the suite and rejects with a
 * 409 if anything regressed, so a stale badge can't sneak a broken
 * submission through.
 */
export function SubmitButton() {
    const session = useArenaStore((s) => s.session);
    const fileContents = useArenaStore((s) => s.fileContents);
    const mergeSessionMeta = useArenaStore((s) => s.mergeSessionMeta);
    const setTerminalOpen = useArenaStore((s) => s.setTerminalOpen);
    const appendTerminalLine = useArenaStore((s) => s.appendTerminalLine);

    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const isSubmitted = session?.status === "SUBMITTED";
    const lastRunGreen =
        !!session &&
        typeof session.lastRunTotal === "number" &&
        session.lastRunTotal > 0 &&
        session.lastRunFailed === 0;
    const canSubmit =
        !!session &&
        session.status === "IN_PROGRESS" &&
        lastRunGreen &&
        !submitting;

    async function handleSubmit() {
        if (!session || !canSubmit) return;
        setSubmitting(true);
        setTerminalOpen(true);
        appendTerminalLine("");
        appendTerminalLine("$ submit - verifying solution…");

        try {
            const res = await fetch(`/api/sessions/${session.id}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileState: fileContents }),
            });
            const body = await res.json().catch(() => ({}));

            if (!res.ok) {
                // 409 carries the fresh session so the badge reflects the re-run.
                if (body.session)
                    mergeSessionMeta(body.session as DebugSessionResponse);
                appendTerminalLine(
                    `Submit rejected: ${body.error ?? `HTTP ${res.status}`}`,
                );
                if (typeof body.total === "number") {
                    appendTerminalLine(
                        `  ${body.passed}/${body.total} passing - fix the rest and try again.`,
                    );
                }
                return;
            }

            const data = body as SubmitSuccess;
            mergeSessionMeta(data.session);
            appendTerminalLine(
                `✓ Submitted - score ${data.breakdown.score}/100`,
            );
            appendTerminalLine(
                `  base ${data.breakdown.base} · hints −${data.breakdown.hintPenalty} · ` +
                    `attempts −${data.breakdown.attemptPenalty} · time ${
                        data.breakdown.timeAdjustment >= 0 ? "+" : ""
                    }${data.breakdown.timeAdjustment}`,
            );
            router.push(
                `/challenges/${data.session.challengeSlug}/result/${data.session.id}`,
            );
        } catch (err) {
            appendTerminalLine(
                `Submit failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (isSubmitted) {
        return (
            <Button
                size="sm"
                variant="secondary"
                disabled
                title="Session submitted"
            >
                {typeof session?.score === "number"
                    ? `Submitted · ${session.score}/100`
                    : "Submitted"}
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            variant="primary"
            loading={submitting}
            disabled={!canSubmit}
            onClick={handleSubmit}
            title={
                canSubmit
                    ? "Verify and submit your solution"
                    : "Run the tests and get them all passing to submit"
            }
        >
            {submitting ? "Submitting" : "Submit"}
        </Button>
    );
}
