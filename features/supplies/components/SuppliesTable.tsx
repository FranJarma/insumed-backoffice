"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, PackageCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EditSupplyDialog } from "./EditSupplyDialog";
import { deleteSupply, updateSupplyStatus } from "../actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SUPPLY_STATUS_LABELS } from "../types";
import type { MockSupply } from "@/db/mock-store";

type SupplyWithStatus = MockSupply & { status?: string };
type CategoryOption = { id: string; name: string };

const STATUS_STYLES: Record<string, string> = {
  en_deposito: "bg-blue-100 text-blue-700",
  en_entrega: "bg-amber-100 text-amber-700",
  entregado: "bg-green-100 text-green-700",
};

function SupplyStatusBadge({ status }: { status: string }) {
  const label = SUPPLY_STATUS_LABELS[status] ?? status;
  const style = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

interface SuppliesTableProps {
  supplies: SupplyWithStatus[];
  categories: CategoryOption[];
}

export function SuppliesTable({ supplies, categories }: SuppliesTableProps) {
  const router = useRouter();
  const [editSupply, setEditSupply] = useState<SupplyWithStatus | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const hasUncategorizedSupplies = supplies.some((s) => !s.category);

  const filteredSupplies = useMemo(() => {
    if (!selectedCategory) return supplies;
    if (selectedCategory === "__uncategorized") return supplies.filter((s) => !s.category);
    return supplies.filter((s) => s.category === selectedCategory);
  }, [selectedCategory, supplies]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { unitPriceTotal: number; vatPriceTotal: number }> = {};
    for (const s of filteredSupplies) {
      const cat = s.category || "Sin categoría";
      const stock = s.stock ?? 0;
      if (!totals[cat]) totals[cat] = { unitPriceTotal: 0, vatPriceTotal: 0 };
      totals[cat].unitPriceTotal += parseFloat(s.unitPrice) * stock;
      totals[cat].vatPriceTotal += s.priceWithVat ? parseFloat(s.priceWithVat) * stock : 0;
    }
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSupplies]);

  if (supplies.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay insumos registrados.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-end justify-between gap-3 rounded-md border bg-card px-4 py-3">
        <div className="space-y-1.5">
          <label htmlFor="supply-category-filter" className="text-sm font-medium">
            Filtrar por categoría
          </label>
          <select
            id="supply-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-64 rounded-md border bg-background px-3 py-2 ml-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
            {hasUncategorizedSupplies && <option value="__uncategorized">Sin categoría</option>}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredSupplies.length} de {supplies.length} insumos
        </p>
      </div>

      {filteredSupplies.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No hay insumos para la categoría seleccionada.
        </div>
      ) : (
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">PM</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Nº Lote</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead className="text-right">Precio c/IVA</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSupplies.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm font-medium">{s.pm}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="max-w-64 text-sm text-muted-foreground">
                  {s.description || "-"}
                </TableCell>
                <TableCell>
                  {s.category ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {s.category}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{s.stock ?? 0}</TableCell>
                <TableCell>
                  <SupplyStatusBadge status={s.status ?? "en_deposito"} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.lotNumber ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(s.unitPrice)}</TableCell>
                <TableCell className="text-right font-medium">
                  {s.priceWithVat ? formatCurrency(s.priceWithVat) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.expiryDate ? formatDate(s.expiryDate) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {s.status === "en_entrega" && (
                      <Tooltip label="Marcar como entregado">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                          onClick={async () => { await updateSupplyStatus(s.id, "entregado"); router.refresh(); }}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip label="Editar">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditSupply(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Eliminar">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Totales por categoría */}
      <div className="rounded-md border bg-card">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold">Total por categoría</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Total Precio Unit.</TableHead>
              <TableHead className="text-right">Total Precio c/IVA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryTotals.map(([cat, totals]) => (
              <TableRow key={cat}>
                <TableCell className="font-medium">{cat}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(totals.unitPriceTotal)}</TableCell>
                <TableCell className="text-right font-medium">
                  {totals.vatPriceTotal > 0 ? formatCurrency(totals.vatPriceTotal) : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditSupplyDialog
        supply={editSupply}
        categories={categories}
        onOpenChange={(o) => !o && setEditSupply(null)}
      />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteSupply(deleteId);
            router.refresh();
          }
        }}
      />
    </>
  );
}
