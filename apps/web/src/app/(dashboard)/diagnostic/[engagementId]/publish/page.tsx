import { PublishForm } from "./publish-form";

interface Props {
  params: Promise<{ engagementId: string }>;
}

/**
 * Server component shell for the publish page.
 *
 * Awaits params (Next 15 async params) and passes engagementId as a prop
 * to the PublishForm client component. This avoids the fragile
 * window.location.pathname hack that the previous version used.
 */
export default async function PublishPage({ params }: Props) {
  const { engagementId } = await params;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <a
            href={`/diagnostic/${engagementId}`}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Engagement
          </a>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">Publish</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Publish Diagnostic Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Once published, a tokenized link will be generated for the client.
          The refund guarantee requires 10 approved material findings.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Before publishing</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex gap-2">
            <span className="text-gray-400">1.</span>
            All 10+ findings have been approved with narratives
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">2.</span>
            Each finding has at least one evidence scan result
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">3.</span>
            The Finding Audit Appendix will be frozen at publish time
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">4.</span>
            The client link will be publicly accessible (no login required)
          </li>
        </ul>
      </div>

      <PublishForm engagementId={engagementId} />
    </div>
  );
}
