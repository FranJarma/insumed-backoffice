"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, ImageIcon, Pencil, Trash2, CircleDollarSign, RotateCcw } from "lucide-react";
import { fileUrl } from "@/lib/upload";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentMonthKey, currentYear, PeriodFilter } from "@/components/period-filter";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EditPurchaseDialog } from "./EditPurchaseDialog";
import { RevertPurchasePaymentDialog } from "./RevertPurchasePaymentDialog";
import { markPurchaseAsPaid, deletePurchase } from "../actions";
import { formatCurrency, formatDate, monthLabel } from "@/lib/utils";
import { downloadPurchasesExcel, downloadPurchasesPdf } from "@/lib/download";
import type { MockProvider } from "@/db/mock-store";

type PurchaseRow = {
  id: string;
  provider: string;
  invoiceNumber: string;
  date: string;
  amount: string;
  status: "PENDING" | "PAID";
  paymentMethod: string | null;
  remito: string | null;
  remitoUrl: string | null;
  category: "PROVEEDOR" | "VARIOS";
};

interface PurchasesTableProps {
  purchases: PurchaseRow[];
  providers: MockProvider[];
  category?: "PROVEEDOR" | "VARIOS";
}

const STATUS_LABELS: Record<PurchaseRow["status"], string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
};
const STATUS_VARIANT: Record<PurchaseRow["status"], "pending" | "paid"> = {
  PENDING: "pending",
  PAID: "paid",
};

const PAYMENT_LABELS: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  EFECTIVO: "Efectivo",
};

export function PurchasesTable({ purchases, providers }: PurchasesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editPurchase, setEditPurchase] = useState<PurchaseRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [revertPaymentId, setRevertPaymentId] = useState<string | null>(null);
  const [isFullYear, setIsFullYear] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "PENDING" | "PAID">("all");

  const effectiveMonth = `${selectedYear}-${selectedMonth.slice(5)}`;

  const providerNames = useMemo(
    () => providers.map((provider) => provider.name).sort((a, b) => a.localeCompare(b, "es-AR")),
    [providers]
  );

  const filtered = useMemo(
    () =>
      purchases.filter((p) => {
        const matchPeriod = isFullYear ? p.date.startsWith(`${selectedYear}-`) : p.date.startsWith(effectiveMonth);
        const matchProvider = selectedProvider === "all" || p.provider === selectedProvider;
        const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
        return matchPeriod && matchProvider && matchStatus;
      }),
    [purchases, isFullYear, selectedYear, effectiveMonth, selectedProvider, selectedStatus]
  );

  const totalPaid = useMemo(
    () => filtered.filter((p) => p.status === "PAID").reduce((sum, p) => sum + parseFloat(p.amount), 0),
    [filtered]
  );
  const totalPending = useMemo(
    () => filtered.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + parseFloat(p.amount), 0),
    [filtered]
  );
  const total = totalPaid + totalPending;

  const handlePay = (id: string) => {
    startTransition(async () => {
      await markPurchaseAsPaid(id);
      router.refresh();
    });
  };

  const periodLabel = isFullYear ? `Año ${selectedYear}` : monthLabel(effectiveMonth);
  const providerLabel = selectedProvider === "all" ? "todos" : selectedProvider.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          isFullYear={isFullYear}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          onFullYearChange={setIsFullYear}
        />

        {/* Proveedor */}
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los proveedores</option>
          {providerNames.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as "all" | "PENDING" | "PAID")}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="PAID">Pagado</option>
        </select>

        <span className="text-xs text-muted-foreground">{filtered.length} compras</span>

        {/* Descargas */}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => downloadPurchasesExcel(filtered, periodLabel, providerLabel)}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => downloadPurchasesPdf(filtered, periodLabel, providerLabel)}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No hay compras para el periodo seleccionado.
        </div>
      ) : (
        <>
          {/* Resumen de totales */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Pagado</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Pendiente</span>
                <span className="text-sm font-semibold text-orange-700">{formatCurrency(totalPending)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Total del periodo</span>
              <span className="text-base font-bold">{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="rounded-md border bg-card">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Remito</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Medio de Pago</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">{purchase.provider}</TableCell>
                  <TableCell className="font-mono text-sm">{purchase.invoiceNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{purchase.remito ?? "—"}</span>
                      {purchase.remitoUrl && (
                        <a
                          href={fileUrl(purchase.remitoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver foto del remito"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(purchase.date)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {purchase.paymentMethod ? PAYMENT_LABELS[purchase.paymentMethod] ?? purchase.paymentMethod : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(purchase.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[purchase.status]}>
                      {STATUS_LABELS[purchase.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {purchase.status === "PENDING" && (
                        <>
                          <Tooltip label="Marcar pagado">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-green-700 hover:text-green-700"
                              onClick={() => handlePay(purchase.id)} disabled={isPending}>
                              <CircleDollarSign className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                          <Tooltip label="Editar">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => setEditPurchase(purchase)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        </>
                      )}
                      {purchase.status === "PAID" && (
                        <Tooltip label="Revertir pago">
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                            onClick={() => setRevertPaymentId(purchase.id)} disabled={isPending}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip label="Eliminar">
                        <Button size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(purchase.id)}>
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
        </>
      )}
      <EditPurchaseDialog
        purchase={editPurchase}
        providers={providers}
        onOpenChange={(o) => !o && setEditPurchase(null)}
      />

      <RevertPurchasePaymentDialog
        purchaseId={revertPaymentId}
        open={revertPaymentId !== null}
        onOpenChange={(open) => !open && setRevertPaymentId(null)}
        onSuccess={() => { setRevertPaymentId(null); router.refresh(); }}
      />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deletePurchase(deleteId);
            router.refresh();
          }
        }}
      />
    </div>
  );
}
