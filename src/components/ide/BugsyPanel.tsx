import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PanelHeader } from "@/components/ui/PanelHeader";
import {
    ArrowIcon,
    BugsyMascot,
    MagnifierIcon,
    SparkIcon,
    StackIcon,
} from "@/components/ui/icons";

/**
 * Placeholder for Bugsy, the in-arena AI assistant.
 *
 * Nothing here talks to a model yet - the panel exists to hold the tab's place
 * and show what the feature will be. The composer at the bottom is a
 * deliberately inert mock: it communicates the shape of the thing far better
 * than a sentence would, and every control is `disabled` so it can't be typed
 * into, submitted, or reached by keyboard.
 */
export function BugsyPanel() {
    return (
        <div className="flex h-full flex-col overflow-y-auto bg-vscode-bg-elevated">
            <PanelHeader
                title="Bugsy"
                subtitle="Your debugging companion."
                action={
                    <Badge tone="accent" size="sm">
                        Coming soon
                    </Badge>
                }
            />

            <div className="flex flex-1 flex-col gap-5 px-5 py-6">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="relative">
                        <span
                            aria-hidden
                            className="absolute inset-0 rounded-full bg-vscode-accent/20 blur-xl"
                        />
                        <BugsyMascot className="relative h-20 w-20 text-vscode-accent" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-vscode-fg">
                            Bugsy is still in the lab
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-vscode-fg-muted">
                            An assistant that reads the failing test with you and
                            asks the next useful question - instead of handing
                            over the answer.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-vscode-fg-subtle">
                        What it will do
                    </p>
                    {CAPABILITIES.map((c) => (
                        <Card key={c.title} className="flex gap-3">
                            <span
                                aria-hidden
                                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-vscode-accent/15 text-vscode-accent"
                            >
                                {c.icon}
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-vscode-fg">
                                    {c.title}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-vscode-fg-muted">
                                    {c.body}
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="mt-auto space-y-2">
                    <div
                        aria-hidden
                        className="flex items-center gap-2 rounded-md border border-vscode-border-subtle bg-vscode-bg px-3 py-2 opacity-50"
                    >
                        <span className="flex-1 truncate text-xs text-vscode-fg-subtle">
                            Ask Bugsy why this test fails...
                        </span>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-vscode-accent/20 text-vscode-accent">
                            <ArrowIcon className="h-3.5 w-3.5" />
                        </span>
                    </div>
                    <p className="text-center text-[11px] text-vscode-fg-subtle">
                        Until then, the{" "}
                        <span className="text-vscode-fg-muted">Hints</span> tab
                        has you covered.
                    </p>
                </div>
            </div>
        </div>
    );
}

const CAPABILITIES = [
    {
        title: "Read the failure with you",
        body: "Point at the assertion that broke and walk back to the line that caused it.",
        icon: <MagnifierIcon className="h-3.5 w-3.5" />,
    },
    {
        title: "Ask, not answer",
        body: "Nudges you toward the bug so the fix stays yours - and so does the score.",
        icon: <SparkIcon className="h-3.5 w-3.5" />,
    },
    {
        title: "Know this codebase",
        body: "Sees the files you have open and the tests for this challenge, not generic advice.",
        icon: <StackIcon className="h-3.5 w-3.5" />,
    },
];
