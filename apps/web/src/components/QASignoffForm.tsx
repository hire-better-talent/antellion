"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signoffQA } from "@/app/(dashboard)/actions/qa";
import { Card, CardHeader, CardBody } from "@antellion/ui";

interface QASignoffFormProps {
  reportQAId: string;
  qaStatus: string;
  isSignedOff: boolean;
  signedOffAt?: Date | string | null;
  confidence?: string | null;
  signoffNote?: string | null;
}

const confidenceLevels = ["LOW", "MEDIUM", "HIGH"] as const;

const confidenceStyles: Record<string, { active: string; inactive: string }> = {
  LOW: {
    active: "bg-red-100 text-red-800 border-red-300",
    inactive:
      "bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-700",
  },
  MEDIUM: {
    active: "bg-yellow-100 text-yellow-800 border-yellow-300",
    inactive:
      "bg-white text-gray-600 border-gray-300 hover:bg-yellow-50 hover:text-yellow-700",
  },
  HIGH: {
    active: "bg-green-100 text-green-800 border-green-300",
    inactive:
      "bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-700",
  },
};

function formatSignoffDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QASignoffForm({
  reportQAId,
  qaStatus,
  isSignedOff,
  signedOffAt,
  confidence: existingConfidence,
  signoffNote: existingNote,
}: QASignoffFormProps) {
  const [confidence, setConfidence] = useState<string>("MEDIUM");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canSignOff = qaStatus === "PASS" || qaStatus === "CONDITIONAL_PASS";

  // Already signed off — show info only
  if (isSignedOff && signedOffAt) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">QA Sign-Off</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-600">{"\u2713"}</span>
              <span className="text-sm font-medium text-gray-900">
                Signed off on {formatSignoffDate(signedOffAt)}
              </span>
            </div>
            {existingConfidence && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Confidence:</span>{" "}
                {existingConfidence}
              </p>
            )}
            {existingNote && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Note:</span> {existingNote}
              </p>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  // Cannot sign off — QA failed
  if (!canSignOff) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">QA Sign-Off</h3>
        </CardHeader>
        <CardBody>
          <div className="rounded-md bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              Resolve all blocking issues before signing off. QA status must be
              PASS or CONDITIONAL PASS.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await signoffQA(reportQAId, confidence, note || undefined);
      if (!result.success) {
        setError(result.error ?? "Sign-off failed.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-gray-900">QA Sign-Off</h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {/* Confidence selector */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Confidence
            </label>
            <div className="flex gap-2">
              {confidenceLevels.map((level) => {
                const isActive = confidence === level;
                const styles = confidenceStyles[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidence(level)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      isActive ? styles.active : styles.inactive
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="signoff-note"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Note (optional)
            </label>
            <textarea
              id="signoff-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="Any notes about this QA review..."
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? "Signing off..." : "Sign Off on QA"}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
