"use client";

import { wagmiAdapter, projectId } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { mantleSepoliaTestnet } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { ReownAuthentication } from "@reown/appkit-siwx";

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
  name: "Pact",
  description:
    "An all-in-one finance app for personal, group, and merchant transactions on Mantle, with programmable features like bill splitting, group-based P2P lending, borrowing, betting, and more.",
  url: "https://appkitexampleapp.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mantleSepoliaTestnet],
  defaultNetwork: mantleSepoliaTestnet,
  metadata: metadata,
  // siwx: new ReownAuthentication({
  //   required: false,
  // }),
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    connectMethodsOrder: ["email", "social", "wallet"],
    // email: true, // default to true. has been set up in dashboard
    // socials: ["google", "apple"], // has been set up in dashboard
    emailShowWallets: false, // default to true
  },
  featuredWalletIds: [
    // "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
    // "a29498d225fa4b13468ff4d6cf4ae0ea4adcbd95f07ce8a843a1dee10b632f3f",
  ],
  debug: true, //defaults to false - remove before production
  themeMode: "light", //defaults to user system settings
  themeVariables: {
    "--w3m-font-family": "poppins, sans-serif",
    "--w3m-accent": "#0898f9",
    // "--w3m-color-mix": "red",
    // "--w3m-color-mix-strength": 3,
    // "--w3m-qr-color": "green",
    //'--w3m-font-size-master': "string",
    // "--w3m-border-radius-master": "string",
    // "--apkt-tokens-core-backgroundAccentPrimary-base": "#0898f9",
  },
});

function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
