import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Update the import path below to the correct location of your 'auth' module.
// For example, if 'auth' is in 'src/lib/auth.ts', use the following:
export { handlers as GET, handlers as POST } from "@/lib/auth";
