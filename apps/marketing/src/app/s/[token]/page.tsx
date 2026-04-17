import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@antellion/db";
import type { SnapshotSummary } from "@antellion/core";
import { toPublicSnapshotSummary } from "@antellion/core";
import { ProspectSnapshotView } from "@/components/snapshot-prospect/ProspectSnapshotView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  const scan = await prisma.scanRun.findFirst({
    where: {
      shareToken: token,
      shareTokenRevokedAt: null,
    },
    select: {
      metadata: true,
      client: { select: { name: true } },
    },
  });

  if (!scan) {
    return { title: "Snapshot Unavailable | Antellion" };
  }

  const meta = scan.metadata as Record<string, unknown> | null;
  const prospectName =
    (meta?.prospectName as string | undefined) ?? scan.client.name;

  return {
    title: `AI Visibility Snapshot — ${prospectName} | Antellion`,
    description: `AI employer visibility assessment for ${prospectName}. Prepared by Antellion.`,
    robots: { index: false, follow: false },
  };
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ProspectSnapshotPage({ params }: Props) {
  const { token } = await params;

  // Public lookup — no org scope, token is the access control.
  // Revoked tokens (shareTokenRevokedAt set) are treated as not found.
  const scan = await prisma.scanRun.findFirst({
    where: {
      shareToken: token,
      shareTokenRevokedAt: null,
    },
    select: {
      id: true,
      createdAt: true,
      queryCount: true,
      metadata: true,
      client: { select: { name: true } },
    },
  });

  if (!scan) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Snapshot unavailable
          </h1>
          <p className="text-sm text-gray-500">
            This link may have expired or been revoked. Contact{" "}
            <a
              href="mailto:jordan@antellion.com"
              className="underline underline-offset-2 hover:text-gray-700"
            >
              jordan@antellion.com
            </a>{" "}
            if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const meta = scan.metadata as Record<string, unknown> | null;
  const prospectName =
    (meta?.prospectName as string | undefined) ?? scan.client.name;
  const snapshotSummary = meta?.snapshotSummary as SnapshotSummary | undefined;

  if (!snapshotSummary) {
    // Scan exists but summary not yet computed — treat as unavailable.
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Assessment being prepared
          </h1>
          <p className="text-sm text-gray-500">
            Your Visibility Snapshot is still being finalized. Check back shortly or contact{" "}
            <a
              href="mailto:jordan@antellion.com"
              className="underline underline-offset-2 hover:text-gray-700"
            >
              jordan@antellion.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProspectSnapshotView
      summary={toPublicSnapshotSummary(snapshotSummary)}
      prospectName={prospectName}
      scanDate={scan.createdAt}
      queryCount={scan.queryCount}
    />
  );
}
