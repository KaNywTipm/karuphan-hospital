import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// แตก handlers ออกมาเป็น GET/POST แล้ว export ออกไปตรง ๆ
const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);

export { auth, signIn, signOut, GET, POST };
