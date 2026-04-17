import type { NextConfig } from "next";
import path from "node:path";

// Resolve the monorepo root once so Next's file tracer can follow
// workspace + pnpm-store paths above apps/marketing.
const monorepoRoot = path.join(__dirname, "../..");

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

  // Tell Next's file tracer that the workspace root is two levels up.
  // Without this, nft only walks files under apps/marketing and never
  // sees the Prisma engine binary that lives inside the pnpm store.
  outputFileTracingRoot: monorepoRoot,

  // Explicitly include the Prisma query engine binary + schema in the
  // serverless function bundle. The pnpm virtual store path contains a
  // versioned hash (e.g. @prisma+client@6.19.2_prisma@6.19.2...), so we
  // glob across any matching directory to stay resilient to dep bumps.
  //
  // Glob paths are evaluated by Next with cwd = the Next.js project dir
  // (apps/marketing), so we walk up two levels to reach the monorepo
  // node_modules. See collect-build-traces.js in the next package and
  // https://pris.ly/d/engine-not-found-nextjs
  //
  // The "/" key targets the home route, which hosts the submitLead
  // server action. Static routes are skipped by include-tracing, so
  // page.tsx exports `dynamic = "force-dynamic"` to opt this route in.
  outputFileTracingIncludes: {
    "/": [
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/schema.prisma",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/**/*",
      "../../node_modules/.pnpm/prisma*/node_modules/prisma/libquery_engine-*.node",
    ],
    // The /s/[token] route hits Prisma for public snapshot lookups.
    "/s/[token]": [
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/schema.prisma",
      "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/**/*",
      "../../node_modules/.pnpm/prisma*/node_modules/prisma/libquery_engine-*.node",
    ],
  },
};

export default nextConfig;
