import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: path.join(__dirname, "../frontend"),
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
