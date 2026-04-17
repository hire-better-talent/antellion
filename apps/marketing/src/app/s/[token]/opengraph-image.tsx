import { ImageResponse } from "next/og";
import { prisma } from "@antellion/db";

export const runtime = "nodejs";
export const alt = "AI Visibility Snapshot — Antellion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SnapshotOGImage({ params }: Props) {
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

  const meta = scan?.metadata as Record<string, unknown> | null;
  const prospectName =
    (meta?.prospectName as string | undefined) ?? scan?.client.name ?? "Company";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0B0F14",
          padding: "64px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top: Antellion wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            }}
          />
          <span
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#9ca3af",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Antellion
          </span>
        </div>

        {/* Middle: company name + label */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#3b82f6",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            AI Visibility Snapshot
          </div>
          <div
            style={{
              fontSize: prospectName.length > 20 ? "52px" : "64px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            {prospectName}
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#6b7280",
              marginTop: "4px",
            }}
          >
            100 queries tested across candidate intent themes
          </div>
        </div>

        {/* Bottom: prepared by line */}
        <div
          style={{
            fontSize: "14px",
            color: "#4b5563",
            letterSpacing: "0.02em",
          }}
        >
          Prepared by Antellion &middot; antellion.com
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
