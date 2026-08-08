"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type UploadStatus = "idle" | "uploading" | "error";

export interface UploaderState {
    /**
     * Object URL for the picked file. Set the moment a file is chosen so the
     * UI can show the new image while the request is still in flight.
     */
    previewUrl: string | null;
    status: UploadStatus;
    /** Message from the failed attempt, cleared on the next pick. */
    error: string | null;
}

export interface UploaderProps {
    /**
     * POST target. Receives `multipart/form-data` and must answer
     * `{ url }` on success or `{ error }` with a non-2xx status.
     */
    endpoint: string;
    /** Multipart field name the endpoint reads the file from. */
    fieldName?: string;
    /** `accept` for the underlying file input, e.g. `"image/*"`. */
    accept?: string;
    /** Rejected client-side, before any request is made. */
    maxBytes?: number;
    /** Accessible name for the trigger, e.g. "Upload avatar". */
    label: string;
    /** Revealed over the trigger on hover and keyboard focus. */
    overlay?: ReactNode;
    className?: string;
    onUploaded?: (url: string) => void;
    onError?: (message: string) => void;
    /** The trigger's contents - a function to react to preview/status. */
    children: ReactNode | ((state: UploaderState) => ReactNode);
}

/**
 * Click-to-pick-and-upload trigger: renders whatever you give it as the click
 * target, posts the chosen file to `endpoint`, and hands back the resulting URL.
 *
 * Deliberately unopinionated about looks so the same mechanics (hidden input,
 * object-URL preview, size guard, in-flight state, abort on unmount) back an
 * avatar circle, a drop card, or anything else. `overlay` is the hover
 * affordance; `children` is the resting content.
 *
 * The client-side `maxBytes` check is a courtesy that saves a doomed round
 * trip - the endpoint has to enforce its own limit regardless.
 */
export function Uploader({
    endpoint,
    fieldName = "file",
    accept,
    maxBytes,
    label,
    overlay,
    className,
    onUploaded,
    onError,
    children,
}: UploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    // Object URLs are leaked memory until revoked, and an upload that outlives
    // the component would setState on an unmounted tree - clean up both.
    const objectUrlRef = useRef<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            abortRef.current?.abort();
        };
    }, []);

    function fail(message: string) {
        // Drop the preview too: leaving the rejected image on screen reads as
        // if it were saved, and a reload would contradict it.
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setPreviewUrl(null);
        setStatus("error");
        setError(message);
        onError?.(message);
    }

    async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        // Re-selecting the same file should fire `change` again, so clear the
        // input before any await - the element is reused across picks.
        e.target.value = "";
        if (!file) return;

        if (maxBytes != null && file.size > maxBytes) {
            fail(`File is larger than ${formatBytes(maxBytes)}`);
            return;
        }

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(file);
        setPreviewUrl(objectUrlRef.current);
        setError(null);
        setStatus("uploading");

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const body = new FormData();
        body.append(fieldName, file);

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                body,
                signal: controller.signal,
            });
            const payload = await res.json().catch(() => null);
            if (!res.ok) {
                fail(payload?.error ?? `Upload failed (${res.status})`);
                return;
            }
            if (typeof payload?.url !== "string") {
                fail("Upload succeeded but returned no URL");
                return;
            }
            setStatus("idle");
            onUploaded?.(payload.url);
        } catch (err) {
            // An abort is our own teardown, not a failure worth reporting.
            if (controller.signal.aborted) return;
            fail(err instanceof Error ? err.message : "Upload failed");
        }
    }

    const state: UploaderState = { previewUrl, status, error };

    return (
        <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={label}
            aria-busy={status === "uploading"}
            className={cn(
                "group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-accent",
                className,
            )}
        >
            {typeof children === "function" ? children(state) : children}

            {overlay ? (
                <span
                    className={cn(
                        "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
                        status === "uploading"
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                    )}
                >
                    {overlay}
                </span>
            ) : null}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleChange}
            />
        </button>
    );
}

function formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${Math.round(mb)}MB` : `${Math.round(bytes / 1024)}KB`;
}
