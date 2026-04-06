import { getClients } from "@/features/clients/actions";
import { getSalesWithClients } from "@/features/sales/actions";
import { CreateSaleDialog } from "@/features/sales/components/CreateSaleDialog";
import { SalesTable } from "@/features/sales/components/SalesTable";

export default async function SalesPage() {
  const [salesData, clientsData] = await Promise.all([
    getSalesWithClients(),
    getClients(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">
            Gestión de facturas y cuentas a cobrar
          </p>
        </div>
        <CreateSaleDialog clients={clientsData} />
      </div>
      <SalesTable sales={salesData} />
    </div>
  );
}
