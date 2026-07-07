import { NextResponse } from "next/server";

/**
 * An error carrying the HTTP status and JSON body it should become. Guards
 * (see ./guards) throw these instead of each route hand-rolling the same
 * `NextResponse.json({ error }, { status })` returns. The `route()` wrapper
 * catches them at the handler boundary and serializes them.
 *
 * `extra` is merged into the response body alongside `error` - used for the
 * zod `issues` array and the session/count fields some 409s carry.
 */
export class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly extra?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "HttpError";
    }
}

/** Build a JSON error response. Handy for one-off errors inside a handler. */
export function jsonError(
    status: number,
    message: string,
    extra?: Record<string, unknown>,
): NextResponse {
    return NextResponse.json({ error: message, ...extra }, { status });
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/**
 * Wraps a route handler so any `HttpError` thrown by a guard (or the handler
 * itself) becomes the right JSON error response. Unexpected errors are
 * rethrown untouched so Next.js still surfaces them as a 500.
 *
 * The `Ctx` generic preserves each route's `{ params }` shape.
 */
export function route<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
    return async (req, ctx) => {
        try {
            return await handler(req, ctx);
        } catch (err) {
            if (err instanceof HttpError) {
                return jsonError(err.status, err.message, err.extra);
            }
            throw err;
        }
    };
}
