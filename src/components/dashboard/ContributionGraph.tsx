import { dayKey } from "@/lib/activity";

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const CELL = 12; // px, square size
const GAP = 3; // px, gap between squares

// A month label is only drawn when its run of weeks is wide enough to hold it.
// Narrower runs (the partial months at either end) stay blank rather than being
// clipped mid-word.
const MIN_LABEL_WEEKS = 3;

// Green tints of vscode.success (#4ec9b0). Index 0 is the empty-day cell.
const LEVEL_BG = [
    "rgba(120,120,120,0.12)",
    "rgba(78,201,176,0.30)",
    "rgba(78,201,176,0.50)",
    "rgba(78,201,176,0.75)",
    "rgba(78,201,176,1)",
];

function levelOf(count: number): number {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
}

interface Cell {
    key: string;
    date: Date;
    count: number;
    future: boolean;
}

export interface ContributionGraphProps {
    /** `YYYY-MM-DD` → event count. */
    counts: Record<string, number>;
    /** Total events; if omitted, summed from `counts`. */
    total?: number;
    /** Number of week columns to render. */
    weeks?: number;
    /** Last day shown (defaults to today). */
    endDate?: Date;
    /** Noun used in the header/tooltips, e.g. "submission". */
    unit?: string;
    className?: string;
}

/**
 * GitHub-style contribution heatmap: one square per day, coloured by activity
 * level, laid out in week columns (Sunday → Saturday top-to-bottom). Purely
 * presentational and data-agnostic - feed it any date→count map.
 */
export function ContributionGraph({
    counts,
    total,
    weeks = 53,
    endDate,
    unit = "submission",
    className,
}: ContributionGraphProps) {
    const end = new Date(endDate ?? Date.now());
    end.setHours(0, 0, 0, 0);

    // Start on the Sunday that begins the earliest visible week.
    const start = new Date(end);
    start.setDate(end.getDate() - (weeks * 7 - 1));
    start.setDate(start.getDate() - start.getDay());

    // Extend to the Saturday of the end's week so the last column is full.
    const last = new Date(end);
    last.setDate(last.getDate() + (6 - last.getDay()));

    const cells: Cell[] = [];
    for (
        const cur = new Date(start);
        cur <= last;
        cur.setDate(cur.getDate() + 1)
    ) {
        const key = dayKey(cur);
        const future = cur > end;
        cells.push({
            key,
            date: new Date(cur),
            count: future ? 0 : (counts[key] ?? 0),
            future,
        });
    }

    const columns: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        columns.push(cells.slice(i, i + 7));
    }

    // Month labels span every column belonging to that month instead of sitting
    // in a single 12px cell. A one-cell label has to overflow to be readable,
    // and that overflow counts toward the scroll container's width - which is
    // what put a scrollbar under a graph that otherwise fits.
    const monthRuns: { month: number; span: number; key: string }[] = [];
    for (const week of columns) {
        const month = week[0].date.getMonth();
        const prev = monthRuns[monthRuns.length - 1];
        if (prev && prev.month === month) {
            prev.span += 1;
        } else {
            monthRuns.push({
                month,
                span: 1,
                key: `${week[0].date.getFullYear()}-${month}`,
            });
        }
    }

    const sum = total ?? Object.values(counts).reduce((a, b) => a + b, 0);

    const gridCols = `repeat(${columns.length}, ${CELL}px)`;

    return (
        <div className={className}>
            <div className="mb-4 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-vscode-fg">
                    {sum}
                </span>
                <span className="text-sm text-vscode-fg-muted">
                    {unit}
                    {sum === 1 ? "" : "s"} in the past year
                </span>
            </div>

            <div className="scrollbar-slim overflow-x-auto pb-1">
                <div className="inline-block">
                    <div
                        className="mb-1 grid text-[10px] text-vscode-fg-subtle"
                        style={{
                            gridTemplateColumns: gridCols,
                            gap: `${GAP}px`,
                        }}
                    >
                        {monthRuns.map((run) => (
                            <div
                                key={run.key}
                                className="overflow-hidden whitespace-nowrap"
                                style={{ gridColumn: `span ${run.span}` }}
                            >
                                {run.span >= MIN_LABEL_WEEKS
                                    ? MONTHS[run.month]
                                    : ""}
                            </div>
                        ))}
                    </div>

                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: gridCols,
                            gridTemplateRows: `repeat(7, ${CELL}px)`,
                            gridAutoFlow: "column",
                            gap: `${GAP}px`,
                        }}
                    >
                        {cells.map((cell) =>
                            cell.future ? (
                                <div key={cell.key} />
                            ) : (
                                <div
                                    key={cell.key}
                                    className="rounded-sm"
                                    style={{
                                        backgroundColor:
                                            LEVEL_BG[levelOf(cell.count)],
                                    }}
                                    title={`${cell.count} ${unit}${cell.count === 1 ? "" : "s"} on ${MONTHS[cell.date.getMonth()]} ${cell.date.getDate()}, ${cell.date.getFullYear()}`}
                                />
                            ),
                        )}
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-vscode-fg-subtle">
                        <span className="mr-1">Less</span>
                        {LEVEL_BG.map((bg, i) => (
                            <div
                                key={i}
                                className="rounded-sm"
                                style={{
                                    width: CELL,
                                    height: CELL,
                                    backgroundColor: bg,
                                }}
                            />
                        ))}
                        <span className="ml-1">More</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
