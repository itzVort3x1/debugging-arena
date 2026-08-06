import { Alert } from "@/components/ui/Alert";

/**
 * The validation result strip: the problems a challenge has, or a success
 * notice. Rendered above the editor and reused by any flow that validates a
 * challenge tree.
 */
export interface ValidationSummaryProps {
  errors: string[] | null;
  notice: string | null;
}

export function ValidationSummary({ errors, notice }: ValidationSummaryProps) {
  const hasErrors = errors !== null && errors.length > 0;
  if (!hasErrors && !notice) return null;

  return (
    <>
      {hasErrors ? (
        <Alert tone="error" className="mx-4 mt-3">
          <div className="font-medium">
            {errors.length} problem{errors.length === 1 ? "" : "s"}
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="success" className="mx-4 mt-3">
          {notice}
        </Alert>
      ) : null}
    </>
  );
}
