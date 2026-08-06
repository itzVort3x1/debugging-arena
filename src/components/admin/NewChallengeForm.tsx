"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Label } from "@/components/ui/Label";
import { apiFetch } from "@/lib/api-client";
import { runtimeLabel } from "@/lib/runtimes";

/**
 * Create a challenge. Collects only what identifies it — the server builds the
 * starter tree — then hands off to the editor, which is where the actual
 * authoring happens.
 */
export interface NewChallengeFormProps {
  /** Runtimes with a working runner, from the server. */
  runtimes: string[];
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

/** "Payment Retry Bug" -> "payment-retry-bug". */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewChallengeForm({ runtimes }: NewChallengeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [difficulty, setDifficulty] =
    useState<(typeof DIFFICULTIES)[number]>("easy");
  const [runtime, setRuntime] = useState(runtimes[0] ?? "node");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The slug follows the title until the author edits it themselves.
  const effectiveSlug = slugTouched ? slug : slugify(title);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch<{ ok: true; slug: string }>("/api/admin/challenges", {
        method: "POST",
        json: { slug: effectiveSlug, title: title.trim(), difficulty, runtime },
      });
      router.push(`/admin/challenges/${effectiveSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-8">
      <h1 className="text-lg font-semibold">New challenge</h1>
      <p className="mt-1 text-xs text-vscode-fg-muted">
        Starts as a draft with working starter files. Nothing is live until you
        publish it.
      </p>

      {error ? (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && title.trim() && effectiveSlug) void submit();
        }}
      >
        <FormField
          id="title"
          label="Title"
          placeholder="Checkout applies the wrong discount"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <FormField
          id="slug"
          label="Slug"
          hint="URL and folder name"
          placeholder="checkout-wrong-discount"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />

        <div>
          <Label htmlFor="difficulty">Difficulty</Label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])
            }
            className="w-full rounded-md border border-vscode-border bg-vscode-bg px-3 py-2 text-sm text-vscode-fg focus:border-vscode-accent focus:outline-none focus:ring-2 focus:ring-vscode-accent/30"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="runtime" hint="Only languages with a runner">
            Language
          </Label>
          <select
            id="runtime"
            value={runtime}
            onChange={(e) => setRuntime(e.target.value)}
            className="w-full rounded-md border border-vscode-border bg-vscode-bg px-3 py-2 text-sm text-vscode-fg focus:border-vscode-accent focus:outline-none focus:ring-2 focus:ring-vscode-accent/30"
          >
            {runtimes.map((r) => (
              <option key={r} value={r}>
                {runtimeLabel(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            loading={busy}
            disabled={busy || !title.trim() || !effectiveSlug}
          >
            Create draft
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => router.push("/admin/challenges")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
