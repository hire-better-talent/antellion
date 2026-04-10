import type { NextEngagementPlan, EngagementType } from "@antellion/core";

const engagementLabels: Record<EngagementType, string> = {
  content_authoring: "Content Authoring Retainer",
  monitoring: "Quarterly Monitoring Subscription",
  advisory: "Strategic Advisory Retainer",
  snapshot_upgrade: "Snapshot Upgrade",
  full_assessment: "Full Assessment Upgrade",
};

interface Props {
  plan: NextEngagementPlan;
}

export function NextEngagementCard({ plan }: Props) {
  return (
    <div className="space-y-5">
      {/* Primary proposal */}
      <div className="rounded-md border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Primary proposal
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {plan.primaryEngagementType
                ? engagementLabels[plan.primaryEngagementType]
                : "No primary engagement identified"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {plan.recommendedTimeline}
            </p>
          </div>
          {plan.priceRange && (
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Reference range
              </p>
              <p className="mt-0.5 text-base font-semibold text-gray-900">
                {plan.priceRange}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Materials to prepare */}
      {plan.materialsToPrepare.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Materials to prepare for the second conversation
          </p>
          <ul className="space-y-1.5">
            {plan.materialsToPrepare.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topics to deep dive */}
      {plan.topicsToDeepDive.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Topics to research before the next meeting
          </p>
          <ul className="space-y-1.5">
            {plan.topicsToDeepDive.map((topic, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
