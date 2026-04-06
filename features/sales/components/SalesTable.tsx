"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, ImageIcon } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CancelSaleDialog } from "./CancelSaleDialog";
import { markSaleAsPaid } from "../actions";
import { formatCurrency, formatDate, monthLabel, prevMonth, nextMonth } from "@/lib/utils";
import { downloadSalesExcel, downloadSalesPdf } from "@/lib/download";

type SaleRow = {
  id: string;
  clientName: string | null;
  invoiceType: "A" | "B";
  invoiceNumber: string;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  documentUrl: string | null;
  creditNoteNumber: string | null;
  creditNoteUrl: string | null;
};

interface SalesTableProps {
  sales: SaleRow[];
}

const STATUS_LABELS: Record<SaleRow["status"], string> = {
  PENDING: "A Cobrar",
  PAID: "Cobrado",
  CANCELLED: "Anulado",
};
const STATUS_VARIANT: Record<SaleRow["status"], "pending" | "paid" | "cancelled"> = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
};

function currentYear() {
  return new Date().getFullYear();
}
function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const YEARS = Array.from({ length: 5 }, (_, i) => currentYear() - 2 + i);

export function SalesTable({ sales }: SalesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "PENDING" | "PAID" | "CANCELLED">("all");

  const effectiveMonth = `${selectedYear}-${selectedMonth.slice(5)}`;

  const clientNames = useMemo(
    () => [...new Set(sales.map((s) => s.clientName).filter(Boolean))].sort() as string[],
    [sales]
  );

  const filtered = useMemo(
    () =>
      sales.filter((s) => {
        const matchMonth = s.date.startsWith(effectiveMonth);
        const matchClient = selectedClient === "all" || s.clientName === selectedClient;
        const matchStatus = selectedStatus === "all" || s.status === selectedStatus;
        return matchMonth && matchClient && matchStatus;
      }),
    [sales, effectiveMonth, selectedClient, selectedStatus]
  );

  const totalPaid = useMemo(
    () => filtered.filter((s) => s.status === "PAID").reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const totalPending = useMemo(
    () => filtered.filter((s) => s.status === "PENDING").reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const total = totalPaid + totalPending;

  const handlePay = (id: string) => {
    startTransition(async () => {
      await markSaleAsPaid(id);
      router.refresh();
    });
  };

  const handleMonthNav = (direction: "prev" | "next") => {
    const newMonth = direction === "prev" ? prevMonth(effectiveMonth) : nextMonth(effectiveMonth);
    setSelectedMonth(newMonth);
    setSelectedYear(parseInt(newMonth.slice(0, 4)));
  };

  const periodLabel = monthLabel(effectiveMonth);
  const clientLabel = selectedClient === "all" ? "todos" : selectedClient.toLowerCase().replace(/\s+/g, "-");

  return (
    <>
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Año */}
        <select
          value={selectedYear}
          onChange={(e) => {
            const y = parseInt(e.target.value);
            setSelectedYear(y);
            setSelectedMonth(`${y}-${selectedMonth.slice(5)}`);
          }}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Mes */}
        <div className="flex items-center gap-1 rounded-md border bg-card px-1">
          <button onClick={() => handleMonthNav("prev")} className="rounded p-1 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {monthLabel(effectiveMonth)}
          </span>
          <button onClick={() => handleMonthNav("next")} className="rounded p-1 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Cliente */}
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los clientes</option>
          {clientNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as "all" | "PENDING" | "PAID" | "CANCELLED")}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los estados</option>
          <option value="PENDING">A Cobrar</option>
          <option value="PAID">Cobrado</option>
          <option value="CANCELLED">Anulado</option>
        </select>

        <span className="text-xs text-muted-foreground">
          {filtered.filter(s => s.status !== "CANCELLED").length} facturas
        </span>

        {/* Descargas */}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => downloadSalesExcel(filtered, periodLabel, clientLabel)}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => downloadSalesPdf(filtered, periodLabel, clientLabel)}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No hay ventas para el período seleccionado.
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>OC</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.clientName ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      sale.invoiceType === "A"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {sale.invoiceType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm">{sale.invoiceNumber}</span>
                      {sale.documentUrl && (
                        <a
                          href={sale.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver foto de la factura"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(sale.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.patient ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.oc ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(sale.amount)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABELS[sale.status]}</Badge>
                      {sale.status === "CANCELLED" && sale.creditNoteNumber && (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-muted-foreground">{sale.creditNoteNumber}</span>
                          {sale.creditNoteUrl && (
                            <a href={sale.creditNoteUrl} target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground">
                              <ImageIcon className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {sale.status === "PENDING" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline"
                          className="h-7 gap-1 text-green-700 hover:text-green-700"
                          onClick={() => handlePay(sale.id)} disabled={isPending}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Cobrar
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-7 gap-1 text-destructive hover:text-destructive"
                          onClick={() => setCancelSaleId(sale.id)}>
                          <XCircle className="h-3.5 w-3.5" />
                          Anular
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Filas de totales */}
              <TableRow className="border-t bg-muted/20">
                <TableCell colSpan={6} className="text-right text-xs text-muted-foreground">
                  Subtotal Cobrado
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-green-700">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow className="bg-muted/20">
                <TableCell colSpan={6} className="text-right text-xs text-muted-foreground">
                  Subtotal A Cobrar
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-orange-700">
                  {formatCurrency(totalPending)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow className="border-t-2 bg-muted/40 font-semibold">
                <TableCell colSpan={6} className="text-right text-sm text-muted-foreground">
                  Total del mes
                </TableCell>
                <TableCell className="text-right text-base">{formatCurrency(total)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <CancelSaleDialog
        saleId={cancelSaleId}
        open={cancelSaleId !== null}
        onOpenChange={(open) => !open && setCancelSaleId(null)}
        onSuccess={() => { setCancelSaleId(null); router.refresh(); }}
      />
    </>
  );
}
