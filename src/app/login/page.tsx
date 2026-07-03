import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
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
                {/* ---- Left: welcome back + pitch ---- */}
                <section className="flex flex-1 flex-col justify-center lg:py-16">
                    <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-vscode-border bg-vscode-bg-elevated px-3 py-1 text-xs text-vscode-fg-muted">
                        <span className="h-2 w-2 rounded-full bg-vscode-accent" />
                        Welcome back
                    </div>

                    <h1 className="text-4xl font-bold leading-tight tracking-tight text-vscode-fg sm:text-5xl">
                        Pick up where{" "}
                        <span className="text-vscode-accent">
                            you left off.
                        </span>
                    </h1>

                    <p className="mt-4 max-w-md text-base text-vscode-fg-muted">
                        Your saved sessions, fix history, and AI postmortems are
                        right where you left them. Sign in and get back to
                        debugging.
                    </p>

                    {/* Stat tiles */}
                    <ul className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
                        <StatTile value="3" label="Challenges" />
                        <StatTile value="∞" label="Attempts" />
                        <StatTile value="AI" label="Postmortem" />
                    </ul>

                    {/* Faux terminal showing a passing test */}
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
                                <span className="text-vscode-success">
                                    {"  ✓ "}deduplicates messages on reconnect
                                    (38 ms)
                                </span>
                                {"\n"}
                                <span className="text-vscode-success">
                                    {"  ✓ "}preserves ordering under load (51
                                    ms)
                                </span>
                                {"\n"}
                                <span className="text-vscode-fg-muted">
                                    {"    "}Tests: 2 passed, 0 failed
                                </span>
                            </code>
                        </pre>
                    </div>
                </section>

                {/* ---- Right: form ---- */}
                <section className="flex flex-1 items-center justify-center lg:py-16">
                    <div className="w-full max-w-md">
                        <div className="rounded-xl border border-vscode-border bg-vscode-bg-elevated/80 p-8 shadow-2xl shadow-black/40 backdrop-blur">
                            <Suspense fallback={null}>
                                <LoginForm />
                            </Suspense>
                        </div>

                        <p className="mt-6 text-center text-xs text-vscode-fg-subtle">
                            New to Debugging Arena?{" "}
                            <Link
                                href="/register"
                                className="text-vscode-fg-muted hover:text-vscode-fg"
                            >
                                Create an account
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatTile({ value, label }: { value: string; label: string }) {
    return (
        <li className="rounded-lg border border-vscode-border bg-vscode-bg-elevated/60 px-3 py-2.5 text-center">
            <div className="text-lg font-semibold text-vscode-fg">{value}</div>
            <div className="text-[10px] uppercase tracking-wide text-vscode-fg-subtle">
                {label}
            </div>
        </li>
    );
}
