import type { NextConfig } from "next";
import path from "node:path";

// Resolve the monorepo root so Next's file tracer can follow workspace
// + pnpm-store paths above apps/web.
const monorepoRoot = path.join(__dirname, "../..");

// Prisma engine + client paths in the pnpm virtual store. The pnpm
// store path contains a versioned hash (e.g.
// @prisma+client@6.19.2_prisma@6.19.2...), so we glob across any
// matching directory to stay resilient to dep bumps.
const prismaIncludes = [
  "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node",
  "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/schema.prisma",
  "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/**/*",
  "../../node_modules/.pnpm/prisma*/node_modules/prisma/libquery_engine-*.node",
];

const nextConfig: NextConfig = {
  transpilePackages: ["@antellion/ui", "@antellion/core"],

  // Ensure @prisma/client is always loaded from node_modules at runtime
  // instead of being bundled by webpack. Required in Next 15 monorepo
  // setups where workspace packages re-export Prisma.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

  // Tell Next's file tracer that the workspace root is two levels up.
  // Without this, nft only walks files under apps/web and never sees
  // the Prisma engine binary that lives inside the pnpm store.
  outputFileTracingRoot: monorepoRoot,

  // Explicitly include the Prisma query engine binary + schema in every
  // serverless function that hits the database. Dashboard routes, API
  // routes, and the webhook handler all need it.
  //
  // See https://pris.ly/d/engine-not-found-nextjs
  outputFileTracingIncludes: {
    "/": prismaIncludes,
    "/clients/:path*": prismaIncludes,
    "/scans/:path*": prismaIncludes,
    "/reports/:path*": prismaIncludes,
    "/snapshots/:path*": prismaIncludes,
    "/queries/:path*": prismaIncludes,
    "/content/:path*": prismaIncludes,
    "/leads": prismaIncludes,
    "/api/:path*": prismaIncludes,
  },
};

export default nextConfig;
