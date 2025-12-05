import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../frontend"),
  },

  serverExternalPackages: [
    "pino",
    "thread-stream",
    "@walletconnect/logger",
    "@walletconnect/utils",
    "@walletconnect/universal-provider",
    "@reown/appkit",
    "@reown/appkit-controllers",
    "@reown/appkit-adapter-wagmi",
  ],

  webpack(config) {
    config.module?.rules?.push({
      test: /node_modules[\\/](thread-stream|pino)[\\/].*test.*\.js$/,
      use: "null-loader",
    });

    return config;
  },
};

export default nextConfig;
