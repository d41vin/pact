import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "@/styles/globals.css";

import { headers } from "next/headers"; // added
import ContextProvider from "@/context";
import { ConvexClientProvider } from "./ConvexClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Pact",
  description:
    "An all-in-one finance app for personal, group, and merchant transactions on Hedera, with programmable features like bill splitting, group-based P2P lending, borrowing, betting, and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <ContextProvider cookies={cookies}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ContextProvider>
      </body>
    </html>
  );
}
