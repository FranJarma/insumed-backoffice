import { getSupplyCategories } from "@/features/supply-categories/actions";
import { SupplyCategoriesTable } from "@/features/supply-categories/components/SupplyCategoriesTable";
import { CreateSupplyCategoryDialog } from "@/features/supply-categories/components/CreateSupplyCategoryDialog";
import { requirePermission } from "@/lib/auth";

export default async function SupplyCategoriesPage() {
  await requirePermission("supply_categories:read");
  const categories = await getSupplyCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías de Insumos</h1>
          <p className="text-muted-foreground">
            Administración de categorías para clasificar los insumos
          </p>
        </div>
        <CreateSupplyCategoryDialog />
      </div>
      <SupplyCategoriesTable categories={categories} />
    </div>
  );
}
