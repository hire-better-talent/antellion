import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Match apps/web: transpile workspace TS sources, but DO NOT
  // transpile @antellion/db. Transpiling @antellion/db causes Next
  // to bundle @prisma/client into the server function, which breaks
  // Prisma's runtime engine binary resolution and throws on the
  // first server-side import (manifesting as a digest error on
  // page load, before any user interaction).
  transpilePackages: ["@antellion/core"],
  // Belt-and-braces: ensure @prisma/client is always loaded from
  // node_modules at runtime instead of being bundled by webpack.
  // Required in Next 15 monorepo setups where workspace packages
  // re-export Prisma. (Replaces experimental.serverComponentsExternalPackages.)
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
