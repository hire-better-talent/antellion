/**
 * CoverPage
 *
 * Full-bleed dark cover page for the Antellion audit report.
 *
 * Designed first and foremost for print. The layout is anchored to a fixed
 * print-safe height (11in) so the page occupies a full printed sheet and
 * forces the next section to start on a fresh page. On screen the same
 * layout renders against the same dark surface so the UI matches the PDF
 * the client will receive.
 *
 * Contains no data, no charts, no gradients, and no watermarks. The page is
 * a pure identity surface: logo, report title, client identity, and
 * confidentiality attribution.
 *
 * Client logo is resolved via Clearbit with a declarative fallback through
 * the HTML <object> element so SSR and print both render correctly without
 * JavaScript.
 */

import { BRAND_TOKENS } from "@antellion/core";

interface CoverPageProps {
  clientName: string;
  clientDomain?: string;
  /** Accepts ISO string, display string, or Date. Formatted internally. */
  reportDate: string | Date;
}

function formatReportDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Not a parseable date — assume the caller passed a pre-formatted string.
    return typeof value === "string" ? value : "";
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CoverPage({
  clientName,
  clientDomain,
  reportDate,
}: CoverPageProps) {
  const formattedDate = formatReportDate(reportDate);
  const clearbitUrl = clientDomain
    ? `https://logo.clearbit.com/${clientDomain}`
    : null;

  return (
    <div
      className="cover-page relative flex w-full flex-col"
      style={{
        backgroundColor: BRAND_TOKENS.bgBase,
        color: BRAND_TOKENS.textPrimary,
        minHeight: "11in",
        paddingTop: "0.9in",
        paddingBottom: "0.9in",
        paddingLeft: "0.9in",
        paddingRight: "0.9in",
        pageBreakAfter: "always",
        breakAfter: "page",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Top: Antellion wordmark */}
      <div>
        <img
          src="/logo-horizontal-light.svg"
          alt="Antellion"
          style={{ width: "120px", height: "auto", display: "block" }}
        />
      </div>

      {/* Spacer — pushes the identity block into the lower 60% */}
      <div style={{ flex: "1 1 auto", minHeight: "2.5in" }} />

      {/* Identity block */}
      <div>
        {/* Report title */}
        <h1
          style={{
            color: BRAND_TOKENS.textPrimary,
            fontSize: "48px",
            fontWeight: 400,
            letterSpacing: "0.05em",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          AI Employer Visibility Assessment
        </h1>

        {/* Client logo — declarative Clearbit fallback via <object> */}
        <div style={{ marginTop: "48px" }}>
          {clearbitUrl ? (
            <object
              data={clearbitUrl}
              type="image/png"
              style={{
                width: "160px",
                height: "auto",
                display: "block",
                pointerEvents: "none",
              }}
              aria-label={clientName}
            >
              <span
                style={{
                  color: BRAND_TOKENS.textPrimary,
                  fontSize: "32px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {clientName}
              </span>
            </object>
          ) : (
            <span
              style={{
                color: BRAND_TOKENS.textPrimary,
                fontSize: "32px",
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {clientName}
            </span>
          )}
        </div>

        {/* Metadata block */}
        <dl
          style={{
            margin: "40px 0 0 0",
            color: BRAND_TOKENS.textSecondary,
            fontSize: "13px",
            lineHeight: 1.8,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: "16px",
            rowGap: "4px",
          }}
        >
          <dt style={{ color: BRAND_TOKENS.textTertiary }}>Prepared for:</dt>
          <dd style={{ margin: 0, color: BRAND_TOKENS.textSecondary }}>
            {clientName}
          </dd>
          <dt style={{ color: BRAND_TOKENS.textTertiary }}>Prepared by:</dt>
          <dd style={{ margin: 0, color: BRAND_TOKENS.textSecondary }}>
            Antellion
          </dd>
          <dt style={{ color: BRAND_TOKENS.textTertiary }}>Date:</dt>
          <dd style={{ margin: 0, color: BRAND_TOKENS.textSecondary }}>
            {formattedDate}
          </dd>
        </dl>

        {/* Horizontal rule */}
        <hr
          style={{
            marginTop: "32px",
            border: 0,
            borderTop: `1px solid ${BRAND_TOKENS.bgSurface}`,
          }}
        />

        {/* Confidentiality line */}
        <p
          style={{
            marginTop: "16px",
            color: BRAND_TOKENS.textTertiary,
            fontSize: "11px",
            letterSpacing: "0.03em",
          }}
        >
          Confidential — Prepared exclusively for {clientName}
        </p>
      </div>
    </div>
  );
}
