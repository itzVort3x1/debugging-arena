import { ComingSoon } from "@/components/ui/ComingSoon";

/**
 * Badges panel placeholder. The achievement system isn't built yet, so the card
 * renders its heading with a "Coming soon" marker instead of real badges.
 */
export function BadgesCard() {
    return (
        <div className="flex h-full flex-col rounded-lg border border-vscode-border bg-vscode-bg-elevated/40 px-6 py-5">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-vscode-fg">
                    Badges
                </h2>
                <ComingSoon />
            </div>
            <div className="flex flex-1 items-center justify-center py-8 text-sm text-vscode-fg-subtle">
                Earn badges as you solve challenges.
            </div>
        </div>
    );
}
