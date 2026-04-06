import { getClients } from "@/features/clients/actions";
import { ClientsTable } from "@/features/clients/components/ClientsTable";
import { CreateClientDialog } from "@/features/clients/components/CreateClientDialog";

export default async function ClientsPage() {
  const clientsData = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Obras sociales y clientes registrados
          </p>
        </div>
        <CreateClientDialog />
      </div>
      <ClientsTable clients={clientsData} />
    </div>
  );
}
