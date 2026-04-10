import { Badge } from "./badge";

type BadgeVariant = "default" | "success" | "warning" | "danger";

const scanStatusMap: Record<string, BadgeVariant> = {
  PENDING: "default",
  RUNNING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "default",
};

const reportStatusMap: Record<string, BadgeVariant> = {
  DRAFT: "default",
  GENERATING: "warning",
  REVIEW: "warning",
  PUBLISHED: "success",
  ARCHIVED: "default",
};

const recommendationStatusMap: Record<string, BadgeVariant> = {
  OPEN: "default",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  DISMISSED: "default",
};

function labelFor(status: string): string {
  return status.replace(/_/g, " ");
}

interface StatusBadgeProps {
  type: "scan" | "report" | "recommendation";
  status: string;
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  const maps = {
    scan: scanStatusMap,
    report: reportStatusMap,
    recommendation: recommendationStatusMap,
  };

  const variant = maps[type][status] ?? "default";

  return <Badge variant={variant}>{labelFor(status)}</Badge>;
}
