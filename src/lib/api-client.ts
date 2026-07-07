/**
 * Thin client-side fetch wrapper. Centralizes the JSON POST/PATCH +
 * error-unwrap dance that every data hook and action button repeated by
 * hand: set the JSON headers, serialize the body, and on a non-2xx read the
 * server's `{ error }` payload into a thrown error.
 *
 * Not used by the SSE run stream - that reads `res.body` directly and can't
 * go through a helper that consumes the body.
 */

/**
 * Error thrown by {@link apiFetch} on a non-2xx response. `body` is the
 * parsed JSON payload (when any), so callers that need extra fields off an
 * error response - e.g. submit's 409 carrying the fresh session - can reach
 * them without re-reading the response.
 */
export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly body?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
    /** Serialized as the JSON request body; also sets the Content-Type. */
    json?: unknown;
    /** Fallback error message when the response carries no `error` field. */
    fallbackError?: string;
}

/**
 * Fetch `url` and return the parsed JSON response. Throws {@link ApiError}
 * on a non-2xx status, with `message` taken from the response's `error`
 * field (or `fallbackError` / a generic status message).
 */
export async function apiFetch<T = unknown>(
    url: string,
    options: ApiFetchOptions = {},
): Promise<T> {
    const { json, fallbackError, headers, ...init } = options;

    const res = await fetch(url, {
        ...init,
        headers:
            json !== undefined
                ? { "Content-Type": "application/json", ...headers }
                : headers,
        body: json !== undefined ? JSON.stringify(json) : undefined,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
            (body as { error?: string }).error ??
            fallbackError ??
            `Request failed: ${res.status}`;
        throw new ApiError(res.status, message, body);
    }

    return (await res.json()) as T;
}
