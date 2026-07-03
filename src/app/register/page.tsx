import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-vscode-bg text-vscode-fg">
            {/* Subtle ambient glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-vscode-accent/10 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-vscode-info/10 blur-3xl"
            />

            <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-stretch gap-10 px-6 py-12 lg:flex-row lg:items-center lg:gap-16 lg:py-0">
                {/* ---- Left: brand + pitch ---- */}
                <section className="flex flex-1 flex-col justify-center lg:py-16">
                    <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-vscode-border bg-vscode-bg-elevated px-3 py-1 text-xs text-vscode-fg-muted">
                        <span className="h-2 w-2 rounded-full bg-vscode-success" />
                        Now in beta
                    </div>

                    <h1 className="text-4xl font-bold leading-tight tracking-tight text-vscode-fg sm:text-5xl">
                        Debug like it&apos;s{" "}
                        <span className="text-vscode-accent">
                            3 AM in production.
                        </span>
                    </h1>

                    <p className="mt-4 max-w-md text-base text-vscode-fg-muted">
                        Skip the leetcode. Practice on broken production-style
                        codebases real bugs, real test suites, real stack
                        traces. Find the bug, ship the fix.
                    </p>

                    {/* Feature bullets */}
                    <ul className="mt-8 space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                            <CheckIcon />
                            <span>
                                <span className="text-vscode-fg">
                                    Curated challenges
                                </span>
                                <span className="text-vscode-fg-muted">
                                    {" "}
                                    - race conditions, memory leaks, broken
                                    retries.
                                </span>
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckIcon />
                            <span>
                                <span className="text-vscode-fg">
                                    Real test suites
                                </span>
                                <span className="text-vscode-fg-muted">
                                    {" "}
                                    - Jest runs in-browser. Pass them, you ship.
                                </span>
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckIcon />
                            <span>
                                <span className="text-vscode-fg">
                                    AI postmortems
                                </span>
                                <span className="text-vscode-fg-muted">
                                    {" "}
                                    - get a write-up of what broke and why,
                                    after every fix.
                                </span>
                            </span>
                        </li>
                    </ul>

                    {/* Faux terminal preview */}
                    <div className="mt-10 max-w-md overflow-hidden rounded-lg border border-vscode-border bg-vscode-panel text-xs shadow-2xl shadow-black/40">
                        <div className="flex items-center gap-2 border-b border-vscode-border bg-vscode-bg-elevated px-3 py-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-vscode-error/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-vscode-warning/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-vscode-success/80" />
                            <span className="ml-2 text-vscode-fg-muted">
                                jest | challenge.test.ts
                            </span>
                        </div>
                        <pre className="overflow-x-auto p-3 font-mono leading-relaxed">
                            <code>
                                <span className="text-vscode-fg-muted">$ </span>
                                <span className="text-vscode-fg">
                                    pnpm test
                                </span>
                                {"\n"}
                                <span className="text-vscode-error">
                                    {"  × "}duplicate messages emitted on
                                    reconnect (412 ms)
                                </span>
                                {"\n"}
                                <span className="text-vscode-fg-muted">
                                    {"    "}expected 1 message, got 4
                                </span>
                                {"\n"}
                                <span className="text-vscode-warning">
                                    {"  ! "}fix me → src/chat-server.ts:42
                                </span>
                            </code>
                        </pre>
                    </div>
                </section>

                {/* ---- Right: form ---- */}
                <section className="flex flex-1 items-center justify-center lg:py-16">
                    <div className="w-full max-w-md">
                        <div className="rounded-xl border border-vscode-border bg-vscode-bg-elevated/80 p-8 shadow-2xl shadow-black/40 backdrop-blur">
                            <RegisterForm />
                        </div>

                        <p className="mt-6 text-center text-xs text-vscode-fg-subtle">
                            By registering you agree to actually fix the bugs.{" "}
                            <Link
                                href="/"
                                className="text-vscode-fg-muted hover:text-vscode-fg"
                            >
                                Cancel
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="mt-0.5 h-4 w-4 shrink-0 text-vscode-success"
        >
            <path
                d="M4 10.5l3.5 3.5L16 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
