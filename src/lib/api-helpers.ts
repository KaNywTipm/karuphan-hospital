import { ZodError } from "zod";
export function badRequest(error: unknown) {
    if (error instanceof ZodError) {
        return Response.json(
            { ok: false, error: error.flatten().fieldErrors },
            { status: 400 }
        );
    }
    return Response.json(
        { ok: false, error: (error as any)?.message ?? "Bad request" },
        { status: 400 }
    );
}
