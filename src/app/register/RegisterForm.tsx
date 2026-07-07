"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertCircleIcon,
  ArrowIcon,
  CheckIcon,
  DotIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import { ApiError, apiFetch } from "@/lib/api-client";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ruleResults = useMemo(
    () => passwordRules.map((r) => ({ ...r, met: r.test(password) })),
    [password]
  );
  const passwordValid = ruleResults.every((r) => r.met);

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

      <Field
        id="name"
        label="Name"
        hint="optional"
        type="text"
        value={name}
        onChange={setName}
        autoComplete="name"
      />

      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
      />

      <div>
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
        />
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {ruleResults.map((r) => (
            <li
              key={r.label}
              className={`flex items-center gap-1.5 ${
                r.met ? "text-vscode-success" : "text-vscode-fg-subtle"
              }`}
            >
              {r.met ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <DotIcon className="h-3.5 w-3.5 shrink-0" />
              )}
              {r.label}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-md border border-vscode-error/40 bg-vscode-error/10 px-3 py-2 text-sm text-vscode-error"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}

function Field({
  id,
  label,
  hint,
  type,
  value,
  onChange,
  required,
  autoComplete,
}: FieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && revealed ? "text" : type;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-vscode-fg">
          {label}
        </label>
        {hint && (
          <span className="text-xs text-vscode-fg-subtle">{hint}</span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className={`w-full rounded-md border border-vscode-border bg-vscode-bg px-3 py-2 text-sm text-vscode-fg placeholder:text-vscode-fg-subtle transition-colors focus:border-vscode-accent focus:outline-none focus:ring-2 focus:ring-vscode-accent/30 ${
            isPassword ? "pr-10" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-vscode-fg-muted transition-colors hover:text-vscode-fg"
          >
            {revealed ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
