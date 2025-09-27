import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "@/app/globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });
const notoSansThai = Noto_Sans_Thai({ subsets: ["thai"] });

export const metadata: Metadata = {
  title: "karuphan-hospital",
  description: "Next.js application for managing hospital assets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${inter.className} ${notoSansThai.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
