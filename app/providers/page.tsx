import { getProviders } from "@/features/providers/actions";
import { ProvidersTable } from "@/features/providers/components/ProvidersTable";
import { CreateProviderDialog } from "@/features/providers/components/CreateProviderDialog";

export default async function ProvidersPage() {
  const providersData = await getProviders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">Directorio de proveedores</p>
        </div>
        <CreateProviderDialog />
      </div>
      <ProvidersTable providers={providersData} />
    </div>
  );
}
