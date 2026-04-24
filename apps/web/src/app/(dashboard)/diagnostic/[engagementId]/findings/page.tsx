import { FindingsReview } from "./findings-review";

interface Props {
  params: Promise<{ engagementId: string }>;
}

export default async function FindingsPage({ params }: Props) {
  const { engagementId } = await params;
  return <FindingsReview engagementId={engagementId} />;
}
