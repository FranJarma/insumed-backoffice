import { getSupplies } from "@/features/supplies/actions";
import { SuppliesTable } from "@/features/supplies/components/SuppliesTable";
import { CreateSupplyDialog } from "@/features/supplies/components/CreateSupplyDialog";
import { requirePermission } from "@/lib/auth";

export default async function SuppliesPage() {
  await requirePermission("supplies:read");
  const suppliesData = await getSupplies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insumos</h1>
          <p className="text-muted-foreground">
            Catálogo de insumos médicos con precios unitarios
          </p>
        </div>
        <CreateSupplyDialog />
      </div>
      <SuppliesTable supplies={suppliesData} />
    </div>
  );
}
