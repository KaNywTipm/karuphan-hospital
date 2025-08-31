import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider
            refetchOnWindowFocus={false}
            refetchInterval={0}
            refetchWhenOffline={false}
        >
            {children}
        </SessionProvider>
    );
}
