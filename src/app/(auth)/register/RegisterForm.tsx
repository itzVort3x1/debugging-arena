"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, email, password }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Registration failed");
      return;
    }

    // Auto-login after successful registration
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (!signInResult || signInResult.error) {
      setError("Account created but auto-login failed. Please sign in.");
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-medium text-vscode-fg">Create account</h2>

      <div>
        <label
          htmlFor="name"
          className="block text-sm text-vscode-fg-muted mb-1"
        >
          Name (optional)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded text-vscode-fg placeholder:text-vscode-fg-subtle focus:outline-none focus:ring-1 focus:ring-vscode-accent focus:border-vscode-accent"
        />
      </div>

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
          Password{" "}
          <span className="text-vscode-fg-subtle">(min 8 characters)</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
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
        {submitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-vscode-fg-muted text-center">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-vscode-accent hover:text-vscode-accent-hover"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
