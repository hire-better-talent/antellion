"use client";

import Link from "next/link";
import type { OperatorActionPlan } from "@antellion/core";
import { ValidationItemsCard } from "./ValidationItemsCard";
import { TalkingPointsCard } from "./TalkingPointsCard";
import { PushbackCard } from "./PushbackCard";
import { UpsellCard } from "./UpsellCard";
import { RedFlagsCard } from "./RedFlagsCard";
import { NextEngagementCard } from "./NextEngagementCard";
import { ClientQuestionsCard } from "./ClientQuestionsCard";

interface SectionProps {
  letter: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ letter, title, description, children }: SectionProps) {
  return (
    <div className="print:break-before-page">
      <div className="mb-4 border-b border-gray-200 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">
            {letter}
          </span>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

interface Props {
  reportId: string;
  reportTitle: string;
  plan: OperatorActionPlan;
}

export function OperatorActionPlanView({
  reportId,
  reportTitle,
  plan,
}: Props) {
  const generatedDate = new Date(plan.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const redFlagCriticalCount = plan.redFlags.filter(
    (f) => f.severity === "critical",
  ).length;

  return (
    <>
      {/*
        Print stylesheet — baked into the component so the print view
        is correct regardless of how it's triggered.
        Uses @media print within a style tag.
      */}
      <style>{`
        @media print {
          /* Hide tab nav and dashboard chrome on print */
          nav, header, .no-print { display: none !important; }

          /* Watermark on every page */
          .internal-watermark::before {
            content: "INTERNAL USE ONLY";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 5rem;
            font-weight: 900;
            color: rgba(220, 38, 38, 0.08);
            pointer-events: none;
            z-index: 9999;
            white-space: nowrap;
            letter-spacing: 0.1em;
          }

          /* Force page breaks between sections */
          .print\\:break-before-page {
            break-before: page;
          }

          /* Preserve severity badge colors on print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/*
        Sticky internal warning banner.
        Fixed to top so it stays visible on scroll.
        Hidden on print — the watermark handles the print warning.
      */}
      <div className="fixed inset-x-0 top-0 z-50 bg-red-600 py-2 text-center no-print print:hidden">
        <p className="text-xs font-bold uppercase tracking-widest text-white">
          INTERNAL BRIEFING — NOT FOR CLIENT DELIVERY
        </p>
      </div>

      {/* Main container — top padding to clear the fixed banner */}
      <div className="internal-watermark mt-10 space-y-8 rounded-lg border-2 border-red-500 bg-red-50/40 px-6 pb-8 pt-6 print:border-0 print:bg-white print:mt-0">

        {/* Tab navigation — links back to Report and QA tabs */}
        <nav className="flex items-center gap-1 no-print print:hidden" aria-label="Report tabs">
          <Link
            href={`/reports/${reportId}`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Report
          </Link>
          <Link
            href={`/reports/${reportId}/qa`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            QA Review
          </Link>
          <div
            className="flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
            aria-current="page"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Action Plan (Internal)
          </div>
        </nav>

        {/* Page header */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-700">
              Internal
            </span>
            {redFlagCriticalCount > 0 && (
              <span className="inline-flex rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                {redFlagCriticalCount} critical flag{redFlagCriticalCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <h1 className="text-xl font-semibold text-gray-900">
            {plan.clientName} &mdash; Operator Action Plan
          </h1>
          <p className="text-sm text-gray-500">
            {reportTitle} &middot; Generated {generatedDate} &middot; {plan.validationItems.length} validation item{plan.validationItems.length !== 1 ? "s" : ""} &middot; {plan.redFlags.length} flag{plan.redFlags.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Section A: Findings to Validate ───────────────── */}
        <Section
          letter="A"
          title="Findings to Validate Manually"
          description="Claims in this report that warrant a spot-check before delivery. Verify each before the client meeting."
        >
          <ValidationItemsCard items={plan.validationItems} />
        </Section>

        {/* ── Section B: Talking Points ─────────────────────── */}
        <Section
          letter="B"
          title="Talking Points"
          description="Lead with these. Ranked by compelling score — highest confidence, largest gap, best sourcing."
        >
          <TalkingPointsCard points={plan.talkingPoints} />
        </Section>

        {/* ── Section C: Predicted Pushback ─────────────────── */}
        <Section
          letter="C"
          title="Predicted Pushback"
          description="Probable objections with prepared responses. Sourced from report metadata — situational objections (budget freeze, new CHRO) are not covered here."
        >
          <PushbackCard predictions={plan.pushbackPredictions} />
        </Section>

        {/* ── Section D: Upsell Opportunities ──────────────── */}
        <Section
          letter="D"
          title="Upsell Opportunities"
          description="Follow-on engagements triggered by this report's findings. Each shows the condition that fired."
        >
          <UpsellCard opportunities={plan.upsellOpportunities} />
        </Section>

        {/* ── Section E: Red Flags ──────────────────────────── */}
        <Section
          letter="E"
          title="Red Flags"
          description="Quality concerns sorted by severity. Critical items warrant deleting or caveating sections before sending."
        >
          <RedFlagsCard redFlags={plan.redFlags} />
        </Section>

        {/* ── Section F: Next Engagement Plan ──────────────── */}
        <Section
          letter="F"
          title="Next Engagement Plan"
          description="What to propose in the meeting and what to prepare for the follow-up conversation."
        >
          <NextEngagementCard plan={plan.nextEngagementPlan} />
        </Section>

        {/* ── Section G: Questions to Ask ───────────────────── */}
        <Section
          letter="G"
          title="Questions to Ask the Client"
          description="Turn the report review into a discovery call. Max 3 questions — each maps to a live upsell trigger."
        >
          <ClientQuestionsCard questions={plan.clientQuestions} />
        </Section>

        {/* Print footer */}
        <div className="hidden border-t border-gray-200 pt-4 print:block">
          <p className="text-xs text-gray-400">
            INTERNAL OPERATOR BRIEFING &mdash; NOT FOR CLIENT DELIVERY &mdash; {plan.clientName} &mdash; Generated {generatedDate}
          </p>
        </div>
      </div>
    </>
  );
}
