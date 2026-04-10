"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@antellion/ui";

interface DMTemplateEditorProps {
  template: string;
  /** When true, the textarea is hidden — shows only a copy button (for the primary finding copy). */
  textareaHidden?: boolean;
  label?: string;
}

export function DMTemplateEditor({
  template,
  textareaHidden = false,
  label = "Copy DM",
}: DMTemplateEditorProps) {
  const [value, setValue] = useState(template);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch((err) => {
      console.error("Clipboard write failed:", err);
    });
  }

  if (textareaHidden) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        {copied ? (
          <>
            <svg
              className="h-3.5 w-3.5 text-green-600"
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
            Copied
          </>
        ) : (
          <>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            </svg>
            {label}
          </>
        )}
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">DM Template</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Edit before copying. Changes are not saved.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            {copied ? (
              <>
                <svg
                  className="h-3.5 w-3.5 text-green-600"
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
                Copied
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
                Copy DM
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardBody>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm leading-relaxed text-gray-800 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 resize-y"
          spellCheck={false}
        />
      </CardBody>
    </Card>
  );
}
