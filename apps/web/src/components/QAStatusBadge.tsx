interface QAStatusBadgeProps {
  status: string; // PENDING, PASS, FAIL, CONDITIONAL_PASS
  size?: "sm" | "md";
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  PASS: "bg-green-50 text-green-700",
  FAIL: "bg-red-50 text-red-700",
  CONDITIONAL_PASS: "bg-yellow-50 text-yellow-700",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PASS: "Pass",
  FAIL: "Fail",
  CONDITIONAL_PASS: "Conditional Pass",
};

export function QAStatusBadge({ status, size = "sm" }: QAStatusBadgeProps) {
  const style = statusStyles[status] ?? statusStyles.PENDING;
  const label = statusLabels[status] ?? status;
  const sizeClass =
    size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ${sizeClass} ${style}`}
    >
      {label}
    </span>
  );
}
