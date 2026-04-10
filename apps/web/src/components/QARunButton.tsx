"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { runReportQA } from "@/app/(dashboard)/actions/qa";

interface QARunButtonProps {
  reportId: string;
}

export function QARunButton({ reportId }: QARunButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await runReportQA(reportId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
    >
      {pending ? "Running..." : "Run QA Checks"}
    </button>
  );
}
