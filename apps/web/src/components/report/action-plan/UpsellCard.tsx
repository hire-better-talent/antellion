import type { UpsellOpportunity, EngagementType } from "@antellion/core";

const engagementLabels: Record<EngagementType, string> = {
  content_authoring: "Content Authoring Retainer",
  monitoring: "Quarterly Monitoring Subscription",
  advisory: "Strategic Advisory Retainer",
  snapshot_upgrade: "Snapshot Upgrade",
  full_assessment: "Full Assessment Upgrade",
};

const engagementDescriptions: Record<EngagementType, string> = {
  content_authoring: "Content creation and platform presence build-out",
  monitoring: "Recurring quarterly re-scan and delta reporting",
  advisory: "Strategic brand positioning and platform prioritization",
  snapshot_upgrade: "Expanded query set with deeper stage coverage",
  full_assessment: "Full 50+ query assessment with remediation playbook",
};

interface Props {
  opportunities: UpsellOpportunity[];
}

export function UpsellCard({ opportunities }: Props) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        No clear upsell triggers from this report.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opp, i) => (
        <div
          key={i}
          className="rounded-md border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {engagementLabels[opp.engagementType] ?? opp.engagementType}
                </span>
                <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {engagementDescriptions[opp.engagementType]}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-600">{opp.rationale}</p>

              <div className="mt-2 space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Suggested scope
                </p>
                <p className="text-sm text-gray-700">{opp.suggestedScope}</p>
              </div>
            </div>

            {/* Price range — prominently right-aligned */}
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Reference range
              </p>
              <p className="mt-0.5 text-base font-semibold text-gray-900">
                {opp.priceRange}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
