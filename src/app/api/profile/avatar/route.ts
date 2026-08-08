import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, route } from "@/lib/api/http";
import { requireUserId } from "@/lib/api/guards";
import {
    ACCEPTED_IMAGE_TYPES,
    avatarStorageConfigured,
    deleteAvatarByUrl,
    uploadAvatar,
} from "@/lib/storage/avatars";

/** Server-side cap; the client mirrors it to avoid a doomed round trip. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload the caller's avatar.
 *
 * Takes `multipart/form-data` with a `file` field, stores it in Supabase
 * Storage, and records the resulting public URL on `User.image` so every
 * surface can render the avatar from one column without touching storage.
 *
 * A user may only ever write their own avatar - the id comes from the session,
 * never the request - so there is no ownership check to make beyond auth.
 */
export const POST = route(async (req: Request) => {
    const userId = await requireUserId();

    if (!avatarStorageConfigured()) {
        throw new HttpError(503, "Avatar uploads are not configured");
    }

    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        throw new HttpError(400, "Expected multipart/form-data");
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
        throw new HttpError(400, "No file uploaded");
    }
    if (file.size > MAX_BYTES) {
        throw new HttpError(413, "Image must be 5MB or smaller");
    }
    // Content type is client-supplied and therefore a hint, not proof. It only
    // decides the stored extension and is checked against an allow-list; a
    // mislabelled file is served as the type it claims, which is why the bucket
    // holds nothing but avatars and is read-only to everyone but this route.
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        throw new HttpError(415, "Image must be PNG, JPEG, WebP or GIF");
    }

    const previous = await prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
    });

    let url: string;
    try {
        url = await uploadAvatar(userId, file);
    } catch (err) {
        throw new HttpError(
            502,
            err instanceof Error ? err.message : "Upload failed",
        );
    }

    await prisma.user.update({
        where: { id: userId },
        data: { image: url },
    });

    // Only after the column points at the new object, so a failure here can
    // never leave the user with a URL whose file is gone.
    await deleteAvatarByUrl(previous?.image ?? null);

    return NextResponse.json({ url });
});
