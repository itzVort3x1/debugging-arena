"use client";

import { useState } from "react";
import { initialsFrom } from "@/components/ui/Avatar";
import { Uploader } from "@/components/ui/Uploader";
import { cn } from "@/lib/utils";

/** Matches the server-side cap in the avatar route. */
const MAX_BYTES = 5 * 1024 * 1024;

export interface AvatarUploadProps {
    /** Name/email used to derive fallback initials when no image is set. */
    label: string;
    /** Existing avatar URL, if the user already has one. */
    initialImage?: string | null;
    /** Rendered box size in pixels. */
    size?: number;
    className?: string;
    /** Called with the stored URL once the upload has been persisted. */
    onUploaded?: (url: string) => void;
}

/**
 * Circular avatar that uploads a new image when clicked. Falls back to the
 * user's initials until one is set.
 *
 * The mechanics live in {@link Uploader}; this owns only the round frame and
 * the camera affordance that fades in over it.
 */
export function AvatarUpload({
    label,
    initialImage = null,
    size = 96,
    className,
    onUploaded,
}: AvatarUploadProps) {
    // Seeded from the server value, then replaced by whatever the upload
    // stored, so the avatar survives the object URL being revoked.
    const [storedImage, setStoredImage] = useState(initialImage);
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-center gap-1">
            <Uploader
                endpoint="/api/profile/avatar"
                accept="image/png,image/jpeg,image/webp,image/gif"
                maxBytes={MAX_BYTES}
                label="Upload avatar"
                className={cn(
                    "rounded-full border border-vscode-border bg-vscode-accent/20",
                    className,
                )}
                overlay={<CameraIcon size={Math.round(size * 0.3)} />}
                onUploaded={(url) => {
                    setError(null);
                    setStoredImage(url);
                    onUploaded?.(url);
                }}
                onError={setError}
            >
                {({ previewUrl }) => {
                    const src = previewUrl ?? storedImage;
                    return (
                        <span
                            className="block"
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
                        </span>
                    );
                }}
            </Uploader>

            {error ? (
                <p
                    role="alert"
                    className="max-w-[12rem] text-center text-[11px] leading-tight text-vscode-error"
                >
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function CameraIcon({ size }: { size: number }) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="text-white"
            style={{ width: size, height: size }}
        >
            <path
                d="M2 5.5A1.5 1.5 0 013.5 4h1l.8-1.2A1 1 0 016.1 2.3h3.8a1 1 0 01.8.5L11.5 4h1A1.5 1.5 0 0114 5.5v6A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-6z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
            />
            <circle
                cx="8"
                cy="8.5"
                r="2"
                stroke="currentColor"
                strokeWidth="1.25"
            />
        </svg>
    );
}
