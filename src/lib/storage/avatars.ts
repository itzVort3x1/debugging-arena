import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Avatar images in Supabase Storage.
 *
 * The bucket is expected to be PUBLIC. That is what lets `User.image` hold a
 * plain URL that any `<img>` can render - a private bucket would mean minting a
 * signed, expiring URL on every render, which a stored link cannot represent.
 * Avatars are shown to anyone who can see the profile anyway, so there is
 * nothing here worth gating.
 *
 * Writes go through the service-role key, so this module must never be imported
 * from a client component.
 */

const BUCKET = process.env.SUPABASE_AVATAR_BUCKET ?? "avatars";

/** Extension per accepted MIME type. Doubles as the upload allow-list. */
const EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS);

let cached: SupabaseClient | null = null;

/**
 * The service-role client, or null when storage env vars are absent.
 *
 * Built lazily rather than at module load so a checkout without Supabase
 * storage configured still boots - only the upload route fails, and with a
 * clear message.
 */
function client(): SupabaseClient | null {
    if (cached) return cached;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    cached = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return cached;
}

/** Whether avatar uploads can be served at all in this environment. */
export function avatarStorageConfigured(): boolean {
    return client() !== null;
}

/**
 * Object key for a user's avatar: `<userId>_<epochMillis>.<ext>`.
 *
 * The timestamp makes every upload a new object rather than an overwrite, which
 * sidesteps CDN caching entirely - a replaced avatar appears immediately
 * because its URL changed, instead of waiting out a cached copy of a stable
 * path. The previous object is deleted separately.
 */
function objectKey(userId: string, contentType: string): string {
    return `${userId}_${Date.now()}.${EXTENSIONS[contentType]}`;
}

/**
 * Store `file` as `userId`'s avatar and return its public URL.
 *
 * Throws when storage is unconfigured, the type is not accepted, or Supabase
 * rejects the write - the caller maps those to HTTP status codes.
 */
export async function uploadAvatar(
    userId: string,
    file: File,
): Promise<string> {
    const supabase = client();
    if (!supabase) {
        throw new Error("Avatar storage is not configured");
    }
    if (!EXTENSIONS[file.type]) {
        throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
    }

    const key = objectKey(userId, file.type);
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, await file.arrayBuffer(), {
            contentType: file.type,
            // Keys carry a timestamp, so a collision means something is wrong;
            // fail loudly rather than clobbering another object.
            upsert: false,
        });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return data.publicUrl;
}

/**
 * Best-effort removal of a previously stored avatar, given the URL held in
 * `User.image`.
 *
 * Ignores anything that is not one of our own object URLs (an OAuth avatar, a
 * URL from another bucket) and swallows failures: a leftover object is clutter,
 * not a reason to fail the upload that already succeeded.
 */
export async function deleteAvatarByUrl(url: string | null): Promise<void> {
    if (!url) return;
    const supabase = client();
    if (!supabase) return;

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const at = url.indexOf(marker);
    if (at === -1) return;

    const key = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
    if (!key) return;

    try {
        await supabase.storage.from(BUCKET).remove([key]);
    } catch {
        // Nothing to do - the new avatar is already stored and live.
    }
}
