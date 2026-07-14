export interface StatCountItem {
    label: string;
    count: number;
}

/**
 * A generic "chip + count" list, e.g. LeetCode's Languages panel
 * ("C++ — 346 problems solved"). Presentational and data-agnostic: feed it any
 * {label, count}[] and customize the trailing unit. Reusable for tags, skills,
 * tech stacks, etc.
 */
export function StatCountList({
    items,
    unit = "solved",
    emptyLabel = "Nothing yet.",
}: {
    items: StatCountItem[];
    unit?: string;
    emptyLabel?: string;
}) {
    if (items.length === 0) {
        return <p className="text-sm text-vscode-fg-subtle">{emptyLabel}</p>;
    }
    return (
        <ul className="flex flex-col gap-2.5">
            {items.map((item) => (
                <li
                    key={item.label}
                    className="flex items-center justify-between gap-3"
                >
                    <span className="inline-flex items-center rounded-md bg-vscode-bg-elevated px-2.5 py-1 text-xs font-medium text-vscode-fg">
                        {item.label}
                    </span>
                    <span className="text-xs text-vscode-fg-subtle">
                        <span className="font-semibold text-vscode-fg">
                            {item.count}
                        </span>{" "}
                        {unit}
                    </span>
                </li>
            ))}
        </ul>
    );
}
