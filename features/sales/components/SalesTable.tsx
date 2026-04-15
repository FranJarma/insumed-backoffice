"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { XCircle, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, ImageIcon, Pencil, Trash2, Receipt } from "lucide-react";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { CancelSaleDialog } from "./CancelSaleDialog";
import { EditSaleDialog } from "./EditSaleDialog";
import { InvoiceSaleDialog } from "./InvoiceSaleDialog";
import { deleteSale } from "../actions";
import { formatCurrency, formatDate, monthLabel, prevMonth, nextMonth } from "@/lib/utils";
import { downloadSalesExcel, downloadSalesPdf } from "@/lib/download";
import { fileUrl } from "@/lib/upload";
import type { MockSupply } from "@/db/mock-store";

type PatientOption = { id: string; name: string; clientId: string };

type SaleStatus = "PENDING_INVOICE" | "PENDING" | "INVOICED" | "PAID" | "CANCELLED";

type SaleRow = {
  id: string;
  clientId: string;
  clientName: string | null;
  invoiceType: "A" | "B";
  invoiceNumber: string | null;
  invoiceDate: string | null;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  status: SaleStatus;
  documentUrl: string | null;
  creditNoteNumber: string | null;
  cancellationDate: string | null;
  creditNoteUrl: string | null;
  items?: Array<{ id: string; supplyId: string | null; pm: string; supplyName: string; quantity: string; unitPrice: string; priceWithVat?: string | null; subtotal: string }>;
};

type ClientOption = { id: string; name: string; cuit: string };

interface SalesTableProps {
  sales: SaleRow[];
  clients: ClientOption[];
  patients: PatientOption[];
  supplies: MockSupply[];
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  PENDING_INVOICE: "Pend. Facturar",
  PENDING: "Facturada",      // legacy
  INVOICED: "Facturada",
  PAID: "Facturada",         // legacy
  CANCELLED: "Anulada",
};

const STATUS_VARIANT: Record<SaleStatus, "pending_invoice" | "invoiced" | "cancelled"> = {
  PENDING_INVOICE: "pending_invoice",
  PENDING: "invoiced",
  INVOICED: "invoiced",
  PAID: "invoiced",
  CANCELLED: "cancelled",
};

function currentYear() { return new Date().getFullYear(); }
function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const YEARS = Array.from({ length: 5 }, (_, i) => currentYear() - 2 + i);

export function SalesTable({ sales, clients, patients, supplies }: SalesTableProps) {
  const router = useRouter();
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [invoiceSaleId, setInvoiceSaleId] = useState<string | null>(null);
  const [editSale, setEditSale] = useState<SaleRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "PENDING_INVOICE" | "INVOICED" | "CANCELLED">("all");
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<"all" | "A" | "B">("all");

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
        const matchStatus =
          selectedStatus === "all" ||
          (selectedStatus === "INVOICED"
            ? s.status === "INVOICED" || s.status === "PAID" || s.status === "PENDING"
            : s.status === selectedStatus);
        const matchInvoiceType = selectedInvoiceType === "all" || s.invoiceType === selectedInvoiceType;
        return matchMonth && matchClient && matchStatus && matchInvoiceType;
      }),
    [sales, effectiveMonth, selectedClient, selectedStatus, selectedInvoiceType]
  );

  const totalInvoiced = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "INVOICED" || s.status === "PAID" || s.status === "PENDING")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const totalPendingInvoice = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "PENDING_INVOICE")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const total = totalInvoiced + totalPendingInvoice;

  const handleMonthNav = (direction: "prev" | "next") => {
    const newMonth = direction === "prev" ? prevMonth(effectiveMonth) : nextMonth(effectiveMonth);
    setSelectedMonth(newMonth);
    setSelectedYear(parseInt(newMonth.slice(0, 4)));
  };

  const periodLabel = monthLabel(effectiveMonth);
  const clientLabel = selectedClient === "all" ? "todos" : selectedClient.toLowerCase().replace(/\s+/g, "-");

  // Whether a sale can be invoiced (pending invoice) or edited/cancelled (editable states)
  const isEditableStatus = (status: SaleStatus) =>
    status === "PENDING_INVOICE" || status === "INVOICED" || status === "PENDING";
  const isCancellableStatus = (status: SaleStatus) =>
    status === "INVOICED" || status === "PAID" || status === "PENDING";

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
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Mes */}
        <div className="flex items-center gap-1 rounded-md border bg-card px-1 py-1.5">
          <button onClick={() => handleMonthNav("prev")} className="rounded px-1 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {monthLabel(effectiveMonth)}
          </span>
          <button onClick={() => handleMonthNav("next")} className="rounded px-1 hover:bg-muted">
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
          {clientNames.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Tipo de factura */}
        <select
          value={selectedInvoiceType}
          onChange={(e) => setSelectedInvoiceType(e.target.value as "all" | "A" | "B")}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los tipos</option>
          <option value="A">Factura A</option>
          <option value="B">Factura B</option>
        </select>

        {/* Estado */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los estados</option>
          <option value="PENDING_INVOICE">Pend. Facturar</option>
          <option value="INVOICED">Facturadas</option>
          <option value="CANCELLED">Anuladas</option>
        </select>

        <span className="text-xs text-muted-foreground">
          {filtered.filter(s => s.status !== "CANCELLED").length} ventas
        </span>

        {/* Descargas */}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            onClick={() => downloadSalesExcel(filtered, periodLabel, clientLabel)}>
            <FileSpreadsheet className="h-3.5 w-3.5" />Excel
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            onClick={() => downloadSalesPdf(filtered, periodLabel, clientLabel)}>
            <FileText className="h-3.5 w-3.5" />PDF
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No hay ventas para el período seleccionado.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen de totales */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Facturadas</span>
                <span className="text-sm font-semibold text-blue-700">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Pend. de Facturar</span>
                <span className="text-sm font-semibold text-orange-700">{formatCurrency(totalPendingInvoice)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Total del mes</span>
              <span className="text-base font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

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
                        sale.invoiceType === "A" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {sale.invoiceType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {sale.invoiceNumber ? (
                          <span className="font-mono text-sm">{sale.invoiceNumber}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin factura</span>
                        )}
                        {sale.invoiceDate && (
                          <span className="text-xs text-muted-foreground">
                            Facturada: {formatDate(sale.invoiceDate)}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          {sale.documentUrl && (
                            <a
                              href={fileUrl(sale.documentUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              title="Ver archivo de factura"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              Factura
                            </a>
                          )}
                          {sale.items && sale.items.length > 0 && (
                            <span
                              className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                              title={sale.items.map((i) => `${i.supplyName} x${i.quantity}`).join(", ")}
                            >
                              {sale.items.length} insumo{sale.items.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
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
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs text-muted-foreground">{sale.creditNoteNumber}</span>
                            {sale.cancellationDate && (
                              <span className="text-xs text-muted-foreground">
                                Anulada: {formatDate(sale.cancellationDate)}
                              </span>
                            )}
                            {sale.creditNoteUrl && (
                              <a
                                href={fileUrl(sale.creditNoteUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <ImageIcon className="h-3 w-3" />
                                Nota de crÃ©dito
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Pendiente de Facturar: botón Facturar */}
                        {sale.status === "PENDING_INVOICE" && (
                          <Tooltip label="Facturar">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-primary hover:text-primary"
                              onClick={() => setInvoiceSaleId(sale.id)}>
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        )}
                        {/* Anular solo para ventas facturadas */}
                        {isCancellableStatus(sale.status) && (
                          <Tooltip label="Anular">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setCancelSaleId(sale.id)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        )}
                        {/* Editar para estados editables */}
                        {isEditableStatus(sale.status) && (
                          <>
                            <Tooltip label="Editar">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                onClick={() => setEditSale(sale)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip label="Eliminar">
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(sale.id)}>
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
        </div>
      )}

      <InvoiceSaleDialog
        saleId={invoiceSaleId}
        open={invoiceSaleId !== null}
        onOpenChange={(open) => !open && setInvoiceSaleId(null)}
        onSuccess={() => { setInvoiceSaleId(null); router.refresh(); }}
      />

      <CancelSaleDialog
        saleId={cancelSaleId}
        open={cancelSaleId !== null}
        onOpenChange={(open) => !open && setCancelSaleId(null)}
        onSuccess={() => { setCancelSaleId(null); router.refresh(); }}
      />

      <EditSaleDialog
        sale={editSale}
        clients={clients}
        patients={patients}
        supplies={supplies}
        onOpenChange={(o) => !o && setEditSale(null)}
      />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteSale(deleteId);
            router.refresh();
          }
        }}
      />
    </>
  );
}
