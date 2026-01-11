import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Instrument_Serif, Caprasimo, Inter } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

import { headers } from "next/headers";
import ContextProvider from "@/context";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { XmtpProvider } from "@/providers/xmtp-provider";
import { GlobalMessageListener } from "@/components/messages/global-message-listener";


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

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  subsets: ["latin"],
  weight: ["400"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});


export const metadata: Metadata = {
  title: "Pact",
  description:
    "An all-in-one finance app for personal, group, and merchant transactions on Mantle, with programmable features like bill splitting, group-based P2P lending, borrowing, betting, and more.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${instrumentSerif.variable} ${caprasimo.variable} ${inter.variable} font-sans antialiased bg-linear-to-b from-zinc-100 to-zinc-50 min-h-screen`}
        suppressHydrationWarning
      >
        <ContextProvider cookies={cookies}>
          <ConvexClientProvider>
            <XmtpProvider>
              <GlobalMessageListener />
              <LayoutWrapper>{children}</LayoutWrapper>
            </XmtpProvider>

            <Toaster richColors />
          </ConvexClientProvider>
        </ContextProvider>
      </body>
    </html>
  );
}