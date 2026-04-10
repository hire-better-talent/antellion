import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@antellion/db";

import { Card, CardHeader, CardBody } from "@antellion/ui";
import { PageHeader } from "@/components/page-header";
import { QAStatusBadge } from "@/components/QAStatusBadge";
import { QACheckList } from "@/components/QACheckList";
import { QARunButton } from "@/components/QARunButton";
import { QASignoffForm } from "@/components/QASignoffForm";
import { getReportQA } from "@/app/(dashboard)/actions/qa";
import { formatDateTime } from "@/lib/format";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

function summarizeChecks(
  checks: Array<{ outcome: string }>,
): { pass: number; fail: number; warning: number; skipped: number; total: number } {
  let pass = 0;
  let fail = 0;
  let warning = 0;
  let skipped = 0;
  for (const c of checks) {
    switch (c.outcome) {
      case "PASS":
        pass++;
        break;
      case "FAIL":
        fail++;
        break;
      case "WARNING":
        warning++;
        break;
      case "SKIPPED":
        skipped++;
        break;
    }
  }
  return { pass, fail, warning, skipped, total: checks.length };
}

export default async function QAReviewPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  // Fetch the report for title and existence check
  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, title: true, status: true },
  });

  if (!report) notFound();

  const qa = await getReportQA(id);

  // No QA record yet — show empty state
  if (!qa) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`QA Review \u2014 ${report.title}`}
          description={
            <Link
              href={`/reports/${id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; Back to report
            </Link>
          }
        />

        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-gray-500">
                QA checks have not been run for this report.
              </p>
              <QARunButton reportId={id} />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const summary = summarizeChecks(qa.checks);
  const isSignedOff = qa.signedOffAt !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`QA Review \u2014 ${report.title}`}
        description={
          <Link
            href={`/reports/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to report
          </Link>
        }
      />

      {/* QA Summary Card */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">
                  QA Status:
                </span>
                <QAStatusBadge status={qa.status} size="md" />
              </div>

              <p className="text-sm text-gray-600">
                {summary.pass}/{summary.total} pass
                {summary.warning > 0 && (
                  <span className="text-yellow-600">
                    {" \u00b7 "}{summary.warning} warning{summary.warning !== 1 ? "s" : ""}
                  </span>
                )}
                {summary.fail > 0 && (
                  <span className="text-red-600">
                    {" \u00b7 "}{summary.fail} fail{summary.fail !== 1 ? "s" : ""}
                  </span>
                )}
                {summary.skipped > 0 && (
                  <span className="text-gray-400">
                    {" \u00b7 "}{summary.skipped} skipped
                  </span>
                )}
              </p>

              <p className="text-sm text-gray-500">
                {isSignedOff && qa.signedOffAt ? (
                  <>
                    Signed off on{" "}
                    {formatDateTime(
                      typeof qa.signedOffAt === "string"
                        ? new Date(qa.signedOffAt)
                        : qa.signedOffAt,
                    )}
                    {qa.confidence && (
                      <span>
                        {" \u00b7 "}Confidence: {qa.confidence}
                      </span>
                    )}
                  </>
                ) : (
                  "Not yet signed off"
                )}
              </p>

              {qa.runCompletedAt && (
                <p className="text-xs text-gray-400">
                  Last run:{" "}
                  {formatDateTime(
                    typeof qa.runCompletedAt === "string"
                      ? new Date(qa.runCompletedAt)
                      : qa.runCompletedAt,
                  )}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <QARunButton reportId={id} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Check Results */}
      <QACheckList
        checks={qa.checks.map((c) => ({
          checkKey: c.checkKey,
          category: c.category,
          severity: c.severity,
          outcome: c.outcome,
          detail: c.detail,
          expected: c.expected,
          actual: c.actual,
        }))}
      />

      {/* Sign-Off Form */}
      <QASignoffForm
        reportQAId={qa.id}
        qaStatus={qa.status}
        isSignedOff={isSignedOff}
        signedOffAt={qa.signedOffAt}
        confidence={qa.confidence}
        signoffNote={qa.signoffNote}
      />
    </div>
  );
}
