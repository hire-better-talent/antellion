"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  SnapshotActionPlan,
  SnapshotTalkingPoint,
  SnapshotPushbackItem,
  SnapshotReplyTemplate,
} from "@antellion/core";

// ─── Section chrome ───────────────────────────────────────────

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

// ─── Copy button ──────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch((err) => {
      console.error("Clipboard write failed:", err);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ─── Section A: Talking Points ────────────────────────────────

function TalkingPointsSection({ points }: { points: SnapshotTalkingPoint[] }) {
  return (
    <div className="space-y-3">
      {points.map((point, idx) => (
        <div key={idx} className="rounded-md border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {point.label}
            </span>
            <span className="text-xs tabular-nums text-gray-400">
              Hook score: {Math.round(point.hookScore * 100)}
            </span>
          </div>
          <p className="text-sm text-gray-900 leading-relaxed">{point.detail}</p>
          <p className="mt-1.5 text-xs text-gray-500 font-medium">{point.metric}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Section B: Predicted Pushback ───────────────────────────

function PushbackSection({ items }: { items: SnapshotPushbackItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-md border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm font-medium text-gray-900 mb-1.5">
            &ldquo;{item.pushback}&rdquo;
          </p>
          <p className="text-sm leading-relaxed text-gray-600">{item.counter}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Section C: Questions to Ask ─────────────────────────────

function QuestionsSection({ questions }: { questions: string[] }) {
  return (
    <ol className="space-y-2">
      {questions.map((q, idx) => (
        <li key={idx} className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500">
            {idx + 1}
          </span>
          <p className="text-sm text-gray-800 leading-relaxed">{q}</p>
        </li>
      ))}
    </ol>
  );
}

// ─── Section D: Reply Templates ───────────────────────────────

function ReplyTemplatesSection({ templates }: { templates: SnapshotReplyTemplate[] }) {
  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div key={template.variant} className="rounded-md border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <div>
              <span className="text-xs font-semibold text-gray-700">{template.label}</span>
              <span className="ml-2 text-xs text-gray-400 capitalize">({template.variant.replace("_", " ")})</span>
            </div>
            <CopyButton text={template.body} label="Copy template" />
          </div>
          <div className="px-4 py-3">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700">
              {template.body}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section E: Full Assessment Pitch ────────────────────────

function PitchSection({ pitch }: { pitch: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-relaxed text-gray-900">{pitch}</p>
        <CopyButton text={pitch} />
      </div>
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────

interface Props {
  scanRunId: string;
  prospectName: string;
  plan: SnapshotActionPlan;
}

export function SnapshotActionPlanView({ scanRunId, prospectName, plan }: Props) {
  const generatedDate = new Date(plan.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
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
          .print\\:break-before-page {
            break-before: page;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Internal banner */}
      <div className="fixed inset-x-0 top-0 z-50 bg-red-600 py-2 text-center no-print print:hidden">
        <p className="text-xs font-bold uppercase tracking-widest text-white">
          INTERNAL BRIEFING — NOT FOR PROSPECT DELIVERY
        </p>
      </div>

      <div className="internal-watermark mt-10 space-y-8 rounded-lg border-2 border-red-500 bg-red-50/40 px-6 pb-8 pt-6 print:border-0 print:bg-white print:mt-0">

        {/* Tab navigation */}
        <nav className="flex items-center gap-1 no-print print:hidden" aria-label="Snapshot tabs">
          <Link
            href={`/snapshots/${scanRunId}`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Findings
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
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {prospectName} &mdash; Snapshot Action Plan
          </h1>
          <p className="text-sm text-gray-500">
            Generated {generatedDate} &middot; Use before outreach follow-up
          </p>
        </div>

        {/* A: Talking Points */}
        <Section
          letter="A"
          title="Talking Points"
          description="Lead with the highest hook-score item. These map directly to what the Snapshot showed."
        >
          <TalkingPointsSection points={plan.talkingPoints} />
        </Section>

        {/* B: Predicted Pushback */}
        <Section
          letter="B"
          title="Predicted Pushback"
          description="Probable objections with prepared responses. Know these before the follow-up call."
        >
          <PushbackSection items={plan.predictedPushback} />
        </Section>

        {/* C: Questions to Ask */}
        <Section
          letter="C"
          title="Questions to Ask"
          description="Use these to turn the follow-up into a discovery conversation, not a pitch."
        >
          <QuestionsSection questions={plan.questionsToAsk} />
        </Section>

        {/* D: Reply Templates */}
        <Section
          letter="D"
          title="Reply Templates"
          description="Two variants based on the prospect's response signal. Copy and adapt before sending."
        >
          <ReplyTemplatesSection templates={plan.replyTemplates} />
        </Section>

        {/* E: Full Assessment Pitch */}
        <Section
          letter="E"
          title="Full Assessment Pitch"
          description="One-liner for the upsell. Use verbatim or adapt. Copy it ready to paste."
        >
          <PitchSection pitch={plan.fullAssessmentPitch} />
        </Section>

        {/* Print footer */}
        <div className="hidden border-t border-gray-200 pt-4 print:block">
          <p className="text-xs text-gray-400">
            INTERNAL OPERATOR BRIEFING &mdash; NOT FOR PROSPECT DELIVERY &mdash; {prospectName} &mdash; Generated {generatedDate}
          </p>
        </div>
      </div>
    </>
  );
}
