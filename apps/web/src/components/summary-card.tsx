import { Card, CardBody } from "@antellion/ui";

interface SummaryCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        {detail && <p className="mt-1 text-sm text-gray-400">{detail}</p>}
      </CardBody>
    </Card>
  );
}
