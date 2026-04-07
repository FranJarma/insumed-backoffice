import { getPurchases } from "@/features/purchases/actions";
import { getProviders } from "@/features/providers/actions";
import { CreatePurchaseDialog } from "@/features/purchases/components/CreatePurchaseDialog";
import { PurchasesTable } from "@/features/purchases/components/PurchasesTable";

export default async function MiscPurchasesPage() {
  const [purchasesData, providersData] = await Promise.all([
    getPurchases("VARIOS"),
    getProviders(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras Varias</h1>
          <p className="text-muted-foreground">
            Gastos del día a día y compras ocasionales
          </p>
        </div>
        <CreatePurchaseDialog providers={providersData} category="VARIOS" />
      </div>
      <PurchasesTable purchases={purchasesData} providers={providersData} category="VARIOS" />
    </div>
  );
}
