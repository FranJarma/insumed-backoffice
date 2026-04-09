import { getChecks } from "@/features/checks/actions";
import { getBanks } from "@/features/banks/actions";
import { getClients } from "@/features/clients/actions";
import { getProviders } from "@/features/providers/actions";
import { ChecksTable } from "@/features/checks/components/ChecksTable";
import { CreateCheckDialog } from "@/features/checks/components/CreateCheckDialog";

export default async function ChecksPage() {
  const [checksData, banksData, clientsData, providersData] = await Promise.all([
    getChecks(),
    getBanks(),
    getClients(),
    getProviders(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cheques</h1>
          <p className="text-muted-foreground">Cheques emitidos y recibidos</p>
        </div>
        <CreateCheckDialog banks={banksData} clients={clientsData} providers={providersData} />
      </div>
      <ChecksTable checks={checksData} banks={banksData} clients={clientsData} providers={providersData} />
    </div>
  );
}
