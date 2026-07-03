import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-vscode-bg px-6 text-vscode-fg">
            <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[-6rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-vscode-error/10 blur-3xl"
            />
            <div className="relative flex max-w-md flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-vscode-border bg-vscode-bg-elevated text-vscode-error">
                    <svg
                        aria-hidden
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-7 w-7"
                    >
                        <path
                            d="M10 4a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                        <rect
                            x="6"
                            y="8"
                            width="8"
                            height="8"
                            rx="4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M3 10h3M14 10h3M3 14h3M14 14h3M10 16v1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>

                <p className="mt-6 font-mono text-sm text-vscode-error">404</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-vscode-fg">
                    This page threw an uncaught 404.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-vscode-fg-muted">
                    The challenge or page you&apos;re looking for doesn&apos;t
                    exist - or isn&apos;t yours to view.
                </p>

                <Link
                    href="/"
                    className="mt-8 inline-flex items-center gap-2 rounded-md bg-vscode-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40"
                >
                    ← Back to challenges
                </Link>
            </div>
        </div>
    );
}
