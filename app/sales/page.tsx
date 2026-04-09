import { getClients } from "@/features/clients/actions";
import { getPatients } from "@/features/patients/actions";
import { getSalesWithClients } from "@/features/sales/actions";
import { getSupplies } from "@/features/supplies/actions";
import { CreateSaleDialog } from "@/features/sales/components/CreateSaleDialog";
import { SalesTable } from "@/features/sales/components/SalesTable";
import { requirePermission } from "@/lib/auth";

export default async function SalesPage() {
  await requirePermission("sales:read");
  const [salesData, clientsData, patientsData, suppliesData] = await Promise.all([
    getSalesWithClients(),
    getClients(),
    getPatients(),
    getSupplies(),
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
        <CreateSaleDialog clients={clientsData} patients={patientsData} supplies={suppliesData} />
      </div>
      <SalesTable sales={salesData} clients={clientsData} patients={patientsData} supplies={suppliesData} />
    </div>
  );
}
