"use client";

import { useEffect, useRef, useState } from "react";
import { initialsFrom } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export interface AvatarUploadProps {
    /** Name/email used to derive fallback initials when no image is set. */
    label: string;
    /** Existing avatar URL, if the user already has one. */
    initialImage?: string | null;
    /** Rendered box size in pixels. */
    size?: number;
    className?: string;
    /**
     * Called with the chosen File when the user picks one. Optional: today the
     * dashboard just previews the file locally and does not upload it.
     */
    onFileSelected?: (file: File) => void;
}

/**
 * Circular avatar with a click-to-upload affordance. Selecting a file shows a
 * local preview (via object URL) but does NOT persist anything — persistence is
 * intentionally out of scope for now. Reusable anywhere an editable avatar is
 * needed; pass `onFileSelected` to hook up real upload later.
 */
export function AvatarUpload({
    label,
    initialImage = null,
    size = 96,
    className,
    onFileSelected,
}: AvatarUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Revoke the object URL when it changes/unmounts to avoid leaking blobs.
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const src = preview ?? initialImage;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
        onFileSelected?.(file);
        // Allow re-selecting the same file to fire change again.
        e.target.value = "";
    }

    return (
        <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Upload avatar"
            className={cn(
                "group relative overflow-hidden rounded-full border border-vscode-border bg-vscode-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-accent",
                className,
            )}
            style={{ width: size, height: size }}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                />
            ) : (
                <span
                    className="flex h-full w-full items-center justify-center font-semibold text-vscode-accent"
                    style={{ fontSize: size * 0.32 }}
                >
                    {initialsFrom(label)}
                </span>
            )}

            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <CameraIcon />
                Upload
            </span>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
            />
        </button>
    );
}

function CameraIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3 w-3"
        >
            <path
                d="M2 5.5A1.5 1.5 0 013.5 4h1l.8-1.2A1 1 0 016.1 2.3h3.8a1 1 0 01.8.5L11.5 4h1A1.5 1.5 0 0114 5.5v6A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-6z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
            />
            <circle cx="8" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.25" />
        </svg>
    );
}
