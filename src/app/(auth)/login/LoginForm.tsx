"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (!result || result.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-medium text-vscode-fg">Sign in</h2>

      <div>
        <label
          htmlFor="email"
          className="block text-sm text-vscode-fg-muted mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded text-vscode-fg placeholder:text-vscode-fg-subtle focus:outline-none focus:ring-1 focus:ring-vscode-accent focus:border-vscode-accent"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm text-vscode-fg-muted mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded text-vscode-fg placeholder:text-vscode-fg-subtle focus:outline-none focus:ring-1 focus:ring-vscode-accent focus:border-vscode-accent"
        />
      </div>

      {error && (
        <div className="text-sm text-vscode-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-3 py-2 bg-vscode-accent hover:bg-vscode-accent-hover disabled:opacity-50 text-white rounded font-medium transition-colors"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-vscode-fg-muted text-center">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-vscode-accent hover:text-vscode-accent-hover"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
