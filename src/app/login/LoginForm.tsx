"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AlertCircleIcon,
  ArrowIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
} from "@/components/ui/icons";

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

      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
      />

      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        required
        autoComplete="current-password"
      />

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
