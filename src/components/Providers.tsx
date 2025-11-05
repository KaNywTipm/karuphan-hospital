"use client";
import { SessionProvider } from "next-auth/react";
import { ModalProvider } from "@/components/Modal-Notification/ModalProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider
            refetchOnWindowFocus={false}
            refetchInterval={0}
            refetchWhenOffline={false}
        >
            <ModalProvider>
                {children}
            </ModalProvider>
        </SessionProvider>
    );
}
