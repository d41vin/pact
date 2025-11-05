import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: path.join(__dirname, "../frontend"),
  },
};

export default nextConfig;
