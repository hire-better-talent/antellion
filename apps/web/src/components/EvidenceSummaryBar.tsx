import { prisma } from "@antellion/db";
import { EvidenceBadge } from "./EvidenceBadge";

interface EvidenceSummaryBarProps {
  reportId: string;
}

function confidenceTierLabel(score: number): string {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
}

export async function EvidenceSummaryBar({ reportId }: EvidenceSummaryBarProps) {
  // Fetch all ReportEvidence links for this report with their linked ScanEvidence
  const links = await prisma.reportEvidence.findMany({
    where: { reportId },
    select: {
      id: true,
      scanEvidence: {
        select: {
          id: true,
          status: true,
          confidenceScore: true,
          extractedSources: true,
        },
      },
    },
  });

  if (links.length === 0) return null;

  const evidenceRecords = links.map((l) => l.scanEvidence);

  // Unique ScanEvidence records (a single evidence record can be linked to
  // multiple sections of the same report, so deduplicate by id)
  const uniqueEvidenceMap = new Map(evidenceRecords.map((e) => [e.id, e]));
  const unique = [...uniqueEvidenceMap.values()];

  const totalLinks = links.length; // total report-evidence link records
  const totalUnique = unique.length;

  const approvedCount = unique.filter((e) => e.status === "APPROVED").length;
  const allApproved = approvedCount === totalUnique;

  // Average confidence across unique evidence records
  const scores = unique
    .map((e) => e.confidenceScore)
    .filter((s): s is number => s !== null);
  const avgConfidenceScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

  // Unique cited domains across all evidence
  const domainSet = new Set<string>();
  for (const ev of unique) {
    const sources = ev.extractedSources as
      | { domain: string; url: string }[]
      | null;
    if (Array.isArray(sources)) {
      for (const s of sources) {
        if (s.domain) domainSet.add(s.domain);
      }
    }
  }
  const uniqueDomains = domainSet.size;

  const approvalNote = allApproved
    ? "all approved"
    : `${approvedCount} of ${totalUnique} approved`;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      <span className="font-medium text-gray-500">Evidence basis:</span>

      <span className="text-gray-700">
        <span className="tabular-nums font-medium text-gray-900">
          {totalUnique}
        </span>{" "}
        quer{totalUnique !== 1 ? "ies" : "y"} evaluated
      </span>

      <span className="text-gray-300">·</span>

      <span className="text-gray-700">
        <span className="tabular-nums font-medium text-gray-900">
          {totalUnique}
        </span>{" "}
        evidence record{totalUnique !== 1 ? "s" : ""}{" "}
        <span className="text-gray-500">({approvalNote})</span>
      </span>

      {avgConfidenceScore !== null && (
        <>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5 text-gray-700">
            Avg confidence:
            <EvidenceBadge confidenceScore={avgConfidenceScore} size="sm" />
          </span>
        </>
      )}

      {uniqueDomains > 0 && (
        <>
          <span className="text-gray-300">·</span>
          <span className="text-gray-700">
            <span className="tabular-nums font-medium text-gray-900">
              {uniqueDomains}
            </span>{" "}
            unique source{uniqueDomains !== 1 ? "s" : ""} cited
          </span>
        </>
      )}

      <a
        href="#evidence-trail"
        className="ml-auto shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
      >
        View evidence trail &darr;
      </a>
    </div>
  );
}
