/**
 * MethodologySection
 *
 * Explains how the assessment was conducted. Renders after the executive summary
 * and before main report content. Combines dynamic assessment parameters with
 * static explanatory content about the framework, metrics, and limitations.
 *
 * P3b — see docs/development-plan.md Priority 3.
 */

interface AssessmentParams {
  aiModel: string;
  queryDepth: string;
  focusArea: string;
  queryCount: number;
  scanCount: number;
  assessmentDate: string;
}

interface MethodologySectionProps {
  assessmentParams: AssessmentParams;
  clientName: string;
  printMode?: boolean;
}

// ─── Stage framework definitions ─────────────────────────────

const JOURNEY_STAGES = [
  {
    name: "Discovery",
    description:
      "Measures whether AI surfaces the company when candidates search for employers without naming a specific organization. " +
      "This is the highest-value stage because it reflects earned visibility — the company appears based on merit, not prompting.",
  },
  {
    name: "Evaluation",
    description:
      "Measures how the company is presented when candidates compare employers on compensation, culture, or technical reputation. " +
      "AI pulls from review sites, salary platforms, and press coverage to form these comparisons.",
  },
  {
    name: "Consideration",
    description:
      "Measures how AI describes the company when a candidate asks about it by name. " +
      "This is a prompted stage — the candidate already knows the company and is seeking confirmation or detail.",
  },
  {
    name: "Commitment",
    description:
      "Measures whether AI provides enough information for a candidate to take action — apply, prepare for an interview, or evaluate an offer. " +
      "This stage depends on structured data from job boards, Glassdoor, and career pages.",
  },
];

// ─── Component ───────────────────────────────────────────────

export function MethodologySection({
  assessmentParams,
  clientName,
  printMode = false,
}: MethodologySectionProps) {
  const sectionClass = printMode ? "mt-12 page-break" : "space-y-4";
  const headingClass = printMode
    ? "text-xl font-bold text-gray-900"
    : "text-lg font-semibold text-gray-900";
  const subheadingClass = printMode
    ? "text-sm font-semibold text-gray-800 mt-6"
    : "text-sm font-semibold text-gray-800 mt-5";
  const bodyClass = "mt-2 text-sm leading-relaxed text-gray-700";
  const cardClass = printMode
    ? "mt-3 rounded-lg border border-gray-200 bg-white p-4"
    : "mt-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4";

  return (
    <div className={sectionClass}>
      <h2 className={headingClass}>Assessment Methodology</h2>
      <p className="mt-1 text-sm text-gray-500">
        How this assessment was conducted and how to interpret the findings
      </p>

      {/* 1. Assessment Overview */}
      <div className={printMode ? "mt-4" : ""}>
        <h3 className={subheadingClass}>Assessment Overview</h3>
        <p className={bodyClass}>
          This assessment evaluated {clientName}&apos;s visibility across{" "}
          <strong>{assessmentParams.queryCount} candidate queries</strong>{" "}
          using <strong>{assessmentParams.aiModel}</strong>
          {assessmentParams.assessmentDate && (
            <> on {assessmentParams.assessmentDate}</>
          )}
          . Queries spanned{" "}
          <strong>{assessmentParams.queryDepth}</strong> depth levels
          {assessmentParams.focusArea && assessmentParams.focusArea !== "general" && (
            <>, focused on <strong>{assessmentParams.focusArea}</strong></>
          )}
          , covering the full candidate decision journey from initial discovery
          through application commitment. Results were compared against{" "}
          {assessmentParams.scanCount > 1
            ? `${assessmentParams.scanCount} scan runs`
            : "a single scan run"}{" "}
          to establish baseline measurements.
        </p>
      </div>

      {/* 2. Decision Journey Framework */}
      <div>
        <h3 className={subheadingClass}>Candidate Decision Journey Framework</h3>
        <p className={bodyClass}>
          Candidates increasingly use AI to research employers before applying.
          This assessment maps how {clientName} appears across four stages of the
          candidate decision journey, each corresponding to a different intent
          signal and a different set of AI data sources.
        </p>
        <div className={cardClass}>
          <div className="grid gap-4 sm:grid-cols-2">
            {JOURNEY_STAGES.map((stage) => (
              <div key={stage.name}>
                <p className="text-sm font-semibold text-gray-900">
                  {stage.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Measurement Methodology */}
      <div>
        <h3 className={subheadingClass}>Measurement Methodology</h3>
        <div className={cardClass}>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-gray-900">Mention Detection</dt>
              <dd className="mt-0.5 text-gray-600">
                Each AI response is analyzed for explicit company references.
                The mention rate is the proportion of queries at a given stage
                where the company appeared in the response.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">
                Earned vs. Prompted Visibility
              </dt>
              <dd className="mt-0.5 text-gray-600">
                Discovery and Evaluation stages measure{" "}
                <em>earned visibility</em> — the company appears without being
                named in the query. Consideration and Commitment stages measure{" "}
                <em>prompted visibility</em> — the candidate has already named
                the company. Earned visibility is the stronger signal of AI
                perception because it reflects what the model recommends
                unprompted.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Visibility Scoring</dt>
              <dd className="mt-0.5 text-gray-600">
                Companies are assigned a positioning tier (Champion, Contender,
                Peripheral, Cautionary, or Invisible) at each stage based on
                mention rate, sentiment, and competitor context. These tiers
                indicate relative standing, not absolute quality.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Sentiment Analysis</dt>
              <dd className="mt-0.5 text-gray-600">
                When the company is mentioned, the surrounding text is evaluated
                for positive, neutral, or negative framing. Sentiment reflects
                how favorably AI positions the company, not just whether it
                appears.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Citation Tracking</dt>
              <dd className="mt-0.5 text-gray-600">
                AI responses that include source citations are tracked to
                identify which platforms influence the model&apos;s employer
                recommendations. Citation gaps — platforms the AI cites for
                competitors but not for {clientName} — represent specific
                remediation opportunities.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 4. Quality Assurance */}
      <div>
        <h3 className={subheadingClass}>Quality Assurance</h3>
        <p className={bodyClass}>
          Each finding in this assessment is backed by automated quality checks
          to ensure accuracy and transparency.
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <span>
              <strong className="text-gray-900">Confidence scoring:</strong>{" "}
              Each stage finding carries a confidence indicator (High, Medium,
              or Low) based on sample size and response consistency.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <span>
              <strong className="text-gray-900">Evidence provenance:</strong>{" "}
              Recommendations reference the specific queries and AI responses
              that informed them, enabling independent verification.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <span>
              <strong className="text-gray-900">Source coverage:</strong>{" "}
              Findings note whether AI responses were backed by currently
              indexed sources or based on training data alone.
            </span>
          </li>
        </ul>
      </div>

      {/* 5. Limitations */}
      <div>
        <h3 className={subheadingClass}>Limitations</h3>
        <div
          className={`mt-2 rounded-lg border p-4 ${
            printMode
              ? "border-gray-200 bg-white"
              : "border-amber-100 bg-amber-50/30"
          }`}
        >
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-gray-900">Point-in-time snapshot:</strong>{" "}
                AI model outputs change as training data is updated. This
                assessment reflects visibility as of the assessment date and
                should be repeated periodically to track changes.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-gray-900">Single model:</strong>{" "}
                Results are based on {assessmentParams.aiModel}. Different AI
                models (e.g., GPT-4, Gemini, Claude) may produce different
                visibility outcomes depending on their training data and
                retrieval methods.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-gray-900">Heuristic detection:</strong>{" "}
                Mention detection, sentiment classification, and positioning
                tiers are derived from structured analysis of AI outputs. While
                validated against manual review, edge cases may exist where
                automated classification diverges from human judgment.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
