import type { Difficulty } from "@/types/challenge";

/** Solved / total counts for a single difficulty tier. */
export interface DifficultyProgress {
    difficulty: Difficulty;
    solved: number;
    total: number;
}

// Hex values mirror tailwind.config.ts (vscode.success/warning/error) so the
// SVG strokes match the difficulty Badge tones used elsewhere.
const DIFF_COLOR: Record<Difficulty, string> = {
    easy: "#4ec9b0",
    medium: "#dcdcaa",
    hard: "#f48771",
};

const DIFF_LABEL: Record<Difficulty, string> = {
    easy: "Easy",
    medium: "Med.",
    hard: "Hard",
};

// Fixed tier order so the ring segments are stable regardless of input order.
const ORDER: Difficulty[] = ["easy", "medium", "hard"];

// SVG geometry. pathLength is normalized to 100 so segment maths are in
// percentages. Each tier owns a 1/3 slot; a gap is carved out of each slot so
// the segments read as three distinct arcs.
const PATH_LENGTH = 100;
const SLOT = PATH_LENGTH / 3;
const GAP = 6;
const TRACK_LEN = SLOT - GAP;
const R = 82;
const STROKE = 13;
// Rotate the dash origin (3 o'clock) up and past half a gap so gaps center.
const HALF_GAP_DEG = (GAP / 2 / PATH_LENGTH) * 360;

export function ProgressRing({
    solved,
    total,
    attempting,
    byDifficulty,
}: {
    solved: number;
    total: number;
    attempting: number;
    byDifficulty: DifficultyProgress[];
}) {
    const byDiff = new Map(byDifficulty.map((d) => [d.difficulty, d]));

    return (
        <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 200 200" className="h-full w-full">
                    {ORDER.map((diff, i) => {
                        const d = byDiff.get(diff);
                        const ratio =
                            d && d.total > 0
                                ? Math.min(1, d.solved / d.total)
                                : 0;
                        const fillLen = TRACK_LEN * ratio;
                        const rot = -90 + i * 120 + HALF_GAP_DEG;
                        const color = DIFF_COLOR[diff];
                        return (
                            <g
                                key={diff}
                                transform={`rotate(${rot} 100 100)`}
                            >
                                <circle
                                    cx={100}
                                    cy={100}
                                    r={R}
                                    fill="none"
                                    stroke={color}
                                    strokeOpacity={0.18}
                                    strokeWidth={STROKE}
                                    pathLength={PATH_LENGTH}
                                    strokeDasharray={`${TRACK_LEN} ${PATH_LENGTH - TRACK_LEN}`}
                                />
                                {fillLen > 0 ? (
                                    <circle
                                        cx={100}
                                        cy={100}
                                        r={R}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={STROKE}
                                        strokeLinecap="round"
                                        pathLength={PATH_LENGTH}
                                        strokeDasharray={`${fillLen} ${PATH_LENGTH - fillLen}`}
                                    />
                                ) : null}
                            </g>
                        );
                    })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-4xl font-bold tracking-tight text-vscode-fg">
                            {solved}
                        </span>
                        <span className="text-lg font-medium text-vscode-fg-subtle">
                            /{total}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-medium text-vscode-success">
                        <CheckIcon />
                        Solved
                    </div>
                    {attempting > 0 ? (
                        <div className="mt-2 text-xs text-vscode-fg-subtle">
                            {attempting} Attempting
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-2.5">
                {ORDER.map((diff) => {
                    const d = byDiff.get(diff);
                    return (
                        <div
                            key={diff}
                            className="min-w-[112px] rounded-lg border border-vscode-border bg-vscode-bg-elevated/60 px-4 py-2.5 text-center"
                        >
                            <div
                                className="text-sm font-semibold"
                                style={{ color: DIFF_COLOR[diff] }}
                            >
                                {DIFF_LABEL[diff]}
                            </div>
                            <div className="mt-0.5 text-base font-bold text-vscode-fg">
                                {d?.solved ?? 0}/{d?.total ?? 0}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
        >
            <path
                d="M3.5 8.5l3 3 6-7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
