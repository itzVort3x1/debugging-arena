import sharp from "sharp";
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

/**
 * Types the upload endpoint will consider. This is an early reject, not the
 * real gate - the browser supplies the MIME type and can say anything. What
 * actually decides is whether sharp can decode the bytes.
 */
export const ACCEPTED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
];

/** Every stored avatar is normalized to this, whatever came in. */
const STORED_EXTENSION = "webp";
const STORED_CONTENT_TYPE = "image/webp";

/** Square edge, in px. Covers a 96px avatar on a 2x display with room spare. */
const EDGE = 256;

/**
 * Ceiling on decoded pixels, independent of file size. A few hundred KB of
 * highly compressible PNG can decode to hundreds of megapixels, so the byte cap
 * on the request is no protection on its own. 50MP still clears any real
 * camera.
 */
const MAX_INPUT_PIXELS = 50_000_000;

/** A file we could not turn into an image - the caller's fault, not ours. */
export class InvalidImageError extends Error {
    constructor(message = "Could not read that file as an image") {
        super(message);
        this.name = "InvalidImageError";
    }
}

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
 * Object key for a user's avatar: `<userId>_<epochMillis>.webp`.
 *
 * The timestamp makes every upload a new object rather than an overwrite, which
 * sidesteps CDN caching entirely - a replaced avatar appears immediately
 * because its URL changed, instead of waiting out a cached copy of a stable
 * path. The previous object is deleted separately.
 */
function objectKey(userId: string): string {
    return `${userId}_${Date.now()}.${STORED_EXTENSION}`;
}

/**
 * Decode an upload and re-encode it as a square WebP avatar.
 *
 * This - not the MIME allow-list - is what establishes that the bytes are an
 * image at all, since decoding something that isn't one fails here. Storing the
 * re-encoded output rather than the original also means:
 *
 *   - a 5MB camera photo becomes ~15KB, and the avatar renders on every
 *     authenticated page;
 *   - EXIF goes away. Phone photos carry GPS coordinates, and these objects
 *     live at public URLs;
 *   - nothing reaches the bucket in a format we didn't produce, so a file
 *     crafted to be valid in two formats at once can't be served back as the
 *     more interesting one.
 *
 * Animated GIFs are flattened to their first frame - sharp only carries
 * animation through with `{ animated: true }`, and resizing every frame costs
 * far more than a static avatar is worth.
 *
 * Throws {@link InvalidImageError} for anything undecodable.
 */
export async function normalizeAvatar(file: File): Promise<Buffer> {
    const input = Buffer.from(await file.arrayBuffer());
    try {
        return await sharp(input, {
            limitInputPixels: MAX_INPUT_PIXELS,
            // Tolerate the malformed-but-decodable files real cameras and
            // editors emit; sharp's default rejects on any libvips warning,
            // which turns ordinary phone JPEGs into failed uploads.
            failOn: "none",
        })
            // Must precede resize: applies the EXIF orientation flag while the
            // image is still in its original frame, then drops the metadata.
            .rotate()
            .resize(EDGE, EDGE, { fit: "cover", position: "centre" })
            .webp({ quality: 82 })
            .toBuffer();
    } catch (err) {
        throw new InvalidImageError(
            err instanceof Error && /pixel|limit/i.test(err.message)
                ? "Image resolution is too large"
                : undefined,
        );
    }
}

/**
 * Store an already-normalized avatar for `userId` and return its public URL.
 *
 * Throws when storage is unconfigured or Supabase rejects the write; the caller
 * maps those to HTTP status codes.
 */
export async function uploadAvatar(
    userId: string,
    image: Buffer,
): Promise<string> {
    const supabase = client();
    if (!supabase) {
        throw new Error("Avatar storage is not configured");
    }

    const key = objectKey(userId);
    const { error } = await supabase.storage.from(BUCKET).upload(key, image, {
        contentType: STORED_CONTENT_TYPE,
        // Keys are immutable - a new upload is a new key - so the object at
        // this URL can never change and may be cached indefinitely.
        cacheControl: "31536000, immutable",
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
