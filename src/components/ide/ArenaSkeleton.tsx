import { cn } from "@/lib/utils";

/**
 * Placeholder chrome shown while the arena resolves.
 *
 * Mirrors {@link ArenaLayout}'s real geometry - same 11px title bar, 56-wide
 * explorer, 96-wide right rail, 9-high tab strips, 6-high status bar - so the
 * page doesn't reflow when the real thing arrives. A centred spinner on an
 * empty screen reads as "nothing is happening"; a skeleton in the shape of the
 * destination reads as "it's coming".
 *
 * Deliberately static markup with no store access, so it can render both from
 * the route's `loading.tsx` (before any JS for the page has run) and from the
 * client while it resolves the session. Sharing one component across both is
 * what stops a visible flash at the handover between them.
 */
export function ArenaSkeleton() {
    return (
        <>
            {/* Below `lg` the arena shows a notice rather than the IDE, so the
                full skeleton would be a promise the page doesn't keep. */}
            <div className="flex h-screen items-center justify-center bg-vscode-bg lg:hidden">
                <div className="flex w-64 flex-col items-center gap-3">
                    <Bar className="h-3 w-40" />
                    <Bar className="h-2 w-24" />
                </div>
            </div>

            <div className="hidden h-screen flex-col bg-vscode-bg lg:flex">
                {/* title bar */}
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-vscode-border bg-vscode-titlebar px-3">
                    <div className="flex items-center gap-3">
                        <Bar className="h-3 w-32" />
                        <Bar className="h-3 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Bar className="h-6 w-20 rounded-md" />
                        <Bar className="h-6 w-24 rounded-md" />
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* file explorer */}
                    <div className="w-56 shrink-0 border-r border-vscode-border p-3">
                        <Bar className="mb-4 h-2.5 w-20" />
                        <div className="space-y-2.5">
                            {FILE_WIDTHS.map((w, i) => (
                                <Bar key={i} className="h-2.5" style={{ width: w }} />
                            ))}
                        </div>
                    </div>

                    {/* editor */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-vscode-border bg-vscode-bg-elevated px-3">
                            <Bar className="h-3 w-28" />
                            <Bar className="h-3 w-20" />
                        </div>
                        <div className="flex-1 space-y-3 p-5">
                            {CODE_WIDTHS.map((w, i) => (
                                <Bar key={i} className="h-2.5" style={{ width: w }} />
                            ))}
                        </div>
                    </div>

                    {/* right rail */}
                    <div className="flex w-96 shrink-0 flex-col border-l border-vscode-border">
                        <div className="flex h-9 shrink-0 items-center gap-4 border-b border-vscode-border bg-vscode-bg-elevated px-4">
                            <Bar className="h-3 w-14" />
                            <Bar className="h-3 w-10" />
                            <Bar className="h-3 w-12" />
                        </div>
                        <div className="flex-1 bg-vscode-bg-elevated p-5">
                            <Bar className="mb-3 h-4 w-48" />
                            <div className="mb-5 flex gap-2">
                                <Bar className="h-5 w-16 rounded-full" />
                                <Bar className="h-5 w-20 rounded-full" />
                            </div>
                            <div className="space-y-2.5">
                                {PROSE_WIDTHS.map((w, i) => (
                                    <Bar
                                        key={i}
                                        className="h-2.5"
                                        style={{ width: w }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* status bar */}
                <div className="h-6 shrink-0 bg-vscode-statusbar" />
            </div>
        </>
    );
}

/**
 * Irregular widths, so the placeholder reads as text rather than as a stack of
 * identical bars.
 */
const FILE_WIDTHS = ["70%", "85%", "55%", "78%", "62%"];
const CODE_WIDTHS = ["45%", "72%", "38%", "60%", "80%", "30%", "66%", "52%"];
const PROSE_WIDTHS = ["100%", "92%", "97%", "60%", "88%", "74%"];

function Bar({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            aria-hidden
            className={cn(
                "animate-pulse rounded bg-vscode-border/70",
                className,
            )}
            style={style}
        />
    );
}
