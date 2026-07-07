"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowIcon, SpinnerIcon } from "@/components/ui/icons";
import { Alert } from "@/components/ui/Alert";
import { FormField } from "@/components/ui/FormField";

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-vscode-fg">
          Sign in
        </h2>
        <p className="mt-1 text-sm text-vscode-fg-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-vscode-accent hover:text-vscode-accent-hover"
          >
            Register
          </Link>
        </p>
      </div>

      <FormField
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <FormField
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      {error && <Alert>{error}</Alert>}

      <button
        type="submit"
        disabled={submitting}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-vscode-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <SpinnerIcon className="h-4 w-4" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
