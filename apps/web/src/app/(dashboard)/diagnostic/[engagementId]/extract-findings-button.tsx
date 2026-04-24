"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { materializeCandidateFindings } from "@/app/(dashboard)/actions/diagnostic";

interface Props {
  engagementId: string;
}

/**
 * One-shot button that calls materializeCandidateFindings and redirects
 * to the findings review page on success. Visible only when scan is COMPLETED
 * and no findings exist yet (controlled by parent server component).
 */
export function ExtractFindingsButton({ engagementId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClick() {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await materializeCandidateFindings(engagementId);
      if ("error" in result) {
        setErrorMsg(result.error);
      } else {
        router.push(`/diagnostic/${engagementId}/findings`);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Extracting..." : "Extract Candidate Findings"}
      </button>
      {errorMsg && (
        <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
