import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@antellion/core", "@antellion/db"],
};

export default nextConfig;
