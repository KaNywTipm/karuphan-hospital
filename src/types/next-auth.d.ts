import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            role: "ADMIN" | "INTERNAL" | "EXTERNAL";
            department?: string | null;
        };
    }
}
