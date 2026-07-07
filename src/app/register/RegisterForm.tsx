"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowIcon, SpinnerIcon } from "@/components/ui/icons";
import { Alert } from "@/components/ui/Alert";
import { FormField } from "@/components/ui/FormField";
import { PasswordRules, isPasswordValid } from "@/components/ui/PasswordRules";
import { ApiError, apiFetch } from "@/lib/api-client";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = isPasswordValid(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) return;
    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        json: { name: name || undefined, email, password },
        fallbackError: "Registration failed",
      });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof ApiError ? err.message : "Registration failed");
      return;
    }

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-vscode-fg">
          Create your account
        </h2>
        <p className="mt-1 text-sm text-vscode-fg-muted">
          Already have one?{" "}
          <Link
            href="/login"
            className="text-vscode-accent hover:text-vscode-accent-hover"
          >
            Sign in
          </Link>
        </p>
      </div>

      <FormField
        id="name"
        label="Name"
        hint="optional"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />

      <FormField
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <div>
        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <PasswordRules password={password} className="mt-3" />
      </div>

      {error && <Alert>{error}</Alert>}

      <button
        type="submit"
        disabled={submitting || !passwordValid}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-vscode-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <SpinnerIcon className="h-4 w-4" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
