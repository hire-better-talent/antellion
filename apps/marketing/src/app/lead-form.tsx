"use client";

import { useActionState, useState, useRef } from "react";
import { submitLead } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { fieldError } from "@/lib/actions";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "gmx.net",
  "live.com",
  "msn.com",
  "me.com",
  "mac.com",
]);

// ── Dark-themed form field ──────────────────────────────────

function DarkFormField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  error,
  hint,
  onBlur,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  const hasError = error || hint;
  return (
    <div>
      <label
        htmlFor={name}
        className="flex min-h-[2.5rem] items-end text-sm font-medium text-gray-300"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        onBlur={onBlur}
        className={`mt-1.5 block w-full rounded-xl border bg-[#1C2130] px-4 py-3 text-sm text-white placeholder-gray-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#0B0F14] ${
          hasError
            ? "border-red-400 focus:border-red-400 focus:ring-red-400/50"
            : "border-gray-600/50 focus:border-brand-500 focus:ring-brand-500/50"
        }`}
      />
      {hasError && (
        <p className="mt-1.5 text-sm text-red-400">{error || hint}</p>
      )}
    </div>
  );
}

// ─── LeadCaptureForm ────────────────────────────────────────

export function LeadCaptureForm() {
  const [state, formAction] = useActionState(submitLead, null);
  const [emailHint, setEmailHint] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);

  // Track submitted values for personalized confirmation
  const [submittedData, setSubmittedData] = useState<{
    companyName: string;
    contactEmail: string;
    topCompetitor: string;
  } | null>(null);

  function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    const domain = value.split("@")[1]?.toLowerCase();
    if (domain && FREE_EMAIL_DOMAINS.has(domain)) {
      setEmailHint("Please use your work email address.");
    } else {
      setEmailHint(undefined);
    }
  }

  function handleSubmit(formData: FormData) {
    // Capture form values before submission for personalized confirmation
    setSubmittedData({
      companyName: (formData.get("companyName") as string) || "",
      contactEmail: (formData.get("contactEmail") as string) || "",
      topCompetitor: (formData.get("topCompetitor") as string) || "",
    });
    formAction(formData);
  }

  // ── Success state ────────────────────────────────────────
  if (state && "success" in state && state.success) {
    const companyName = submittedData?.companyName || "your company";
    const email = submittedData?.contactEmail || "your inbox";
    const hasCompetitor = !!submittedData?.topCompetitor?.trim();

    return (
      <div className="px-2 py-8 text-center sm:py-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-900/40 shadow-lg shadow-green-500/10">
          <svg
            className="h-7 w-7 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">
          We&apos;re building your visibility analysis now
        </h3>
        <div className="mx-auto mt-5 max-w-md space-y-4 text-sm leading-relaxed text-gray-300">
          <p>
            Each assessment is scoped to your competitive landscape and
            reviewed before delivery. We are designing 100 candidate-intent
            queries specific to{" "}
            <span className="font-medium text-white">{companyName}</span>{" "}
            and your industry. Your personalized Snapshot will be delivered
            to{" "}
            <span className="font-medium text-white">{email}</span> within
            2 business days.
          </p>
          <p>
            What you will receive: your AI mention rate as a measured
            percentage, a ranked competitor comparison, a citation gap analysis
            identifying the specific platforms shaping AI&apos;s answer, and a
            curated interpretation with your primary strength and two biggest
            opportunities.
          </p>
          {hasCompetitor ? (
            <p>
              Since you named a talent competitor, your Snapshot will include a
              direct head-to-head comparison with the gap quantified in
              percentage points.
            </p>
          ) : (
            <p>
              We will identify your most visible competitor from the scan data
              and include a direct comparison with the gap quantified.
            </p>
          )}
          <p className="text-gray-500">
            Questions before then? Reach us at{" "}
            <a
              href="mailto:hello@antellion.com"
              className="text-gray-400 underline hover:text-white"
            >
              hello@antellion.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Form state ───────────────────────────────────────────
  return (
    <form action={handleSubmit} ref={formRef} className="space-y-6">
      {state?.message && (
        <div className="rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {state.message}
        </div>
      )}

      <p className="text-xs uppercase tracking-wide text-gray-500">
        All fields are required
      </p>

      {/* Required: company info */}
      <div className="grid gap-5 sm:grid-cols-2">
        <DarkFormField
          label="Your name"
          name="contactName"
          placeholder="Jane Smith"
          required
          error={fieldError(state, "contactName")}
        />
        <DarkFormField
          label="Work email"
          name="contactEmail"
          type="email"
          placeholder="jane@company.com"
          required
          error={fieldError(state, "contactEmail")}
          hint={emailHint}
          onBlur={handleEmailBlur}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DarkFormField
          label="Company name"
          name="companyName"
          placeholder="Acme Corp"
          required
          error={fieldError(state, "companyName")}
        />
        <DarkFormField
          label="Company website"
          name="companyDomain"
          placeholder="acme.com"
          required
          error={fieldError(state, "companyDomain")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <DarkFormField
          label="Your title"
          name="contactTitle"
          placeholder="VP Talent Acquisition"
          required
          error={fieldError(state, "contactTitle")}
        />
        <DarkFormField
          label="Top competitor"
          name="topCompetitor"
          placeholder="Who you compete with for hires"
          required
          error={fieldError(state, "topCompetitor")}
        />
        <DarkFormField
          label="Primary role"
          name="primaryRole"
          placeholder="e.g., Software Engineers"
          required
          error={fieldError(state, "primaryRole")}
        />
      </div>

      <div className="pt-2">
        <SubmitButton
          label="Run My Visibility Snapshot"
          pendingLabel="Submitting..."
        />
        <p className="mt-4 text-center text-xs text-gray-500">
          Your information is used only to produce your Snapshot. We do not
          share, sell, or distribute your data. No spam. No nurture sequence.
        </p>
      </div>
    </form>
  );
}
