import { getPurchases } from "@/features/purchases/actions";
import { getProviders } from "@/features/providers/actions";
import { CreatePurchaseDialog } from "@/features/purchases/components/CreatePurchaseDialog";
import { PurchasesTable } from "@/features/purchases/components/PurchasesTable";
import { requirePermission } from "@/lib/auth";

export default async function PurchasesPage() {
  await requirePermission("purchases:read");
  const [purchasesData, providersData] = await Promise.all([
    getPurchases("PROVEEDOR"),
    getProviders(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-muted-foreground">
            Facturas de proveedores y pagos pendientes
          </p>
        </div>
        <CreatePurchaseDialog providers={providersData} category="PROVEEDOR" />
      </div>
      <PurchasesTable purchases={purchasesData} providers={providersData} category="PROVEEDOR" />
    </div>
  );
}
