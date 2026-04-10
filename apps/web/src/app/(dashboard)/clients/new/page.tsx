import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/client-form";
import { Card, CardBody } from "@antellion/ui";
import { createClient } from "@/app/(dashboard)/actions/clients";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add client"
        description="Track a new company for AI hiring visibility analysis."
      />
      <Card>
        <CardBody>
          <ClientForm
            action={createClient}
            submitLabel="Create client"
            cancelHref="/clients"
          />
        </CardBody>
      </Card>
    </div>
  );
}
