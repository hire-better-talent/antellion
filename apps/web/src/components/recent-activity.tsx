import { Card, CardHeader, CardBody, StatusBadge } from "@antellion/ui";
import type { ScanRunStatus, ReportStatus } from "@antellion/core";

interface ScanActivity {
  kind: "scan";
  id: string;
  clientName: string;
  status: ScanRunStatus;
  queryCount: number;
  timestamp: string;
}

interface ReportActivity {
  kind: "report";
  id: string;
  clientName: string;
  title: string;
  status: ReportStatus;
  timestamp: string;
}

export type ActivityItem = ScanActivity | ReportActivity;

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-gray-900">
          Recent activity
        </h2>
      </CardHeader>
      {items.length === 0 ? (
        <CardBody>
          <p className="text-sm text-gray-500">
            No activity yet. Run a scan to get started.
          </p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-6 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.kind === "scan"
                    ? `Scan — ${item.clientName}`
                    : item.title}
                </p>
                <p className="text-xs text-gray-500">
                  {item.kind === "scan"
                    ? `${item.queryCount} queries`
                    : item.clientName}
                  {" · "}
                  {item.timestamp}
                </p>
              </div>
              <StatusBadge
                type={item.kind === "scan" ? "scan" : "report"}
                status={item.status}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
