"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { XCircle, CircleDollarSign, FileSpreadsheet, FileText, ImageIcon, Pencil, Trash2, ArrowDownUp, Receipt, RotateCcw } from "lucide-react";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentMonthKey, currentYear, PeriodFilter } from "@/components/period-filter";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { CancelSaleDialog } from "./CancelSaleDialog";
import { EditSaleDialog } from "./EditSaleDialog";
import { InvoiceSaleDialog } from "./InvoiceSaleDialog";
import { RevertSaleInvoiceDialog } from "./RevertSaleInvoiceDialog";
import { SalePaymentsDialog } from "./SalePaymentsDialog";
import { deleteSale } from "../actions";
import { formatCurrency, formatDate, monthLabel } from "@/lib/utils";
import { downloadSalesExcel, downloadSalesPdf } from "@/lib/download";
import { fileUrl } from "@/lib/upload";
import type { MockSupply } from "@/db/mock-store";

type PatientOption = { id: string; name: string; clientId: string };

type SaleStatus = "PENDING_INVOICE" | "PENDING" | "INVOICED" | "PAID" | "INVOICED_PAID" | "CANCELLED";

type SaleRow = {
  id: string;
  clientId: string;
  clientName: string | null;
  invoiceType: "A" | "B" | "AE";
  invoiceNumber: string | null;
  invoiceDate: string | null;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  status: SaleStatus;
  paymentDate: string | null;
  paidAmount?: string;
  balance?: string;
  payments?: Array<{ id: string; amount: string; paymentDate: string; paymentMethod: string | null; reference: string | null; notes: string | null }>;
  documentUrl: string | null;
  creditNoteNumber: string | null;
  creditNoteAmount: string | null;
  cancellationDate: string | null;
  creditNoteUrl: string | null;
  deliveredAt?: Date | string | null;
  items?: Array<{ id: string; supplyId: string | null; pm: string; supplyName: string; quantity: string; unitPrice: string; priceWithVat?: string | null; subtotal: string }>;
};

type ClientOption = { id: string; name: string; cuit: string };

type CategoryOption = { id: string; name: string };
type InvoiceTypeFilter = "all" | "A" | "B" | "AE";
type InvoiceSortDirection = "asc" | "desc" | null;

interface SalesTableProps {
  sales: SaleRow[];
  clients: ClientOption[];
  patients: PatientOption[];
  supplies: MockSupply[];
  categories: CategoryOption[];
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  PENDING_INVOICE: "Pend. Facturar",
  PENDING: "Facturada",      // legacy
  INVOICED: "Facturada",
  PAID: "Pend. Facturar y Pagada",
  INVOICED_PAID: "Facturada y Pagada",
  CANCELLED: "Anulada",
};

const STATUS_VARIANT: Record<SaleStatus, "pending_invoice" | "invoiced" | "paid" | "cancelled"> = {
  PENDING_INVOICE: "pending_invoice",
  PENDING: "invoiced",
  INVOICED: "invoiced",
  PAID: "paid",
  INVOICED_PAID: "paid",
  CANCELLED: "cancelled",
};

const isPaidStatus = (status: SaleStatus) => status === "PAID" || status === "INVOICED_PAID";

const INVOICE_TYPE_LABELS: Record<Exclude<InvoiceTypeFilter, "all">, string> = {
  A: "Factura A",
  B: "Factura B",
  AE: "Factura AE",
};

function invoiceTypeClass(invoiceType: SaleRow["invoiceType"]) {
  if (invoiceType === "A") return "bg-blue-100 text-blue-700";
  if (invoiceType === "B") return "bg-purple-100 text-purple-700";
  return "bg-emerald-100 text-emerald-700";
}

export function SalesTable({ sales, clients, patients, supplies, categories }: SalesTableProps) {
  const router = useRouter();
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [invoiceSaleId, setInvoiceSaleId] = useState<string | null>(null);
  const [revertInvoiceSaleId, setRevertInvoiceSaleId] = useState<string | null>(null);
  const [paymentsSale, setPaymentsSale] = useState<SaleRow | null>(null);
  const [editSale, setEditSale] = useState<SaleRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFullYear, setIsFullYear] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "PENDING_INVOICE" | "INVOICED" | "PAID" | "INVOICED_PAID" | "CANCELLED">("all");
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<InvoiceTypeFilter>("all");
  const [invoiceSortDirection, setInvoiceSortDirection] = useState<InvoiceSortDirection>(null);

  const effectiveMonth = `${selectedYear}-${selectedMonth.slice(5)}`;

  const clientNames = useMemo(
    () => [...new Set(sales.map((s) => s.clientName).filter(Boolean))].sort() as string[],
    [sales]
  );

  const filtered = useMemo(
    () =>
      sales.filter((s) => {
        const matchPeriod = isFullYear ? s.date.startsWith(`${selectedYear}-`) : s.date.startsWith(effectiveMonth);
        const matchClient = selectedClient === "all" || s.clientName === selectedClient;
        const matchStatus =
          selectedStatus === "all" ||
          (selectedStatus === "INVOICED"
            ? s.status === "INVOICED" || s.status === "PENDING"
            : selectedStatus === "PAID"
            ? s.status === "PAID"
            : selectedStatus === "INVOICED_PAID"
            ? s.status === "INVOICED_PAID"
            : s.status === selectedStatus);
        const matchInvoiceType = selectedInvoiceType === "all" || s.invoiceType === selectedInvoiceType;
        return matchPeriod && matchClient && matchStatus && matchInvoiceType;
      }),
    [sales, isFullYear, selectedYear, effectiveMonth, selectedClient, selectedStatus, selectedInvoiceType]
  );

  const displayedSales = useMemo(() => {
    if (!invoiceSortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a.invoiceNumber?.trim();
      const bValue = b.invoiceNumber?.trim();

      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      const result = aValue.localeCompare(bValue, "es-AR", { numeric: true, sensitivity: "base" });
      return invoiceSortDirection === "asc" ? result : -result;
    });
  }, [filtered, invoiceSortDirection]);

  const totalInvoiced = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "INVOICED" || s.status === "PENDING")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const totalUninvoiced = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "PENDING_INVOICE")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const totalPaid = useMemo(
    () =>
      filtered
        .filter((s) => s.status !== "CANCELLED")
        .reduce((sum, s) => sum + parseFloat(s.paidAmount ?? "0"), 0),
    [filtered]
  );
  const totalInvoicedPaid = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "INVOICED_PAID")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const total = useMemo(
    () =>
      filtered
        .filter((s) => s.status !== "CANCELLED")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    [filtered]
  );
  const totalBalance = useMemo(
    () =>
      filtered
        .filter((s) => s.status !== "CANCELLED")
        .reduce((sum, s) => sum + parseFloat(s.balance ?? s.amount), 0),
    [filtered]
  );

  const handleInvoiceSort = () => {
    setInvoiceSortDirection((current) => (current === "asc" ? "desc" : current === "desc" ? null : "asc"));
  };

  const periodLabel = isFullYear ? `Año ${selectedYear}` : monthLabel(effectiveMonth);
  const clientLabel = selectedClient === "all" ? "todos" : selectedClient.toLowerCase().replace(/\s+/g, "-");

  // Whether a sale can be invoiced (pending invoice) or edited/cancelled (editable states)
  const isEditableStatus = (status: SaleStatus) =>
    status === "PENDING_INVOICE" || status === "INVOICED" || status === "PAID" || status === "INVOICED_PAID" || status === "PENDING";
  const isCancellableStatus = (status: SaleStatus) =>
    status === "INVOICED" || status === "PAID" || status === "INVOICED_PAID" || status === "PENDING";

  return (
    <>
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
          onChange={(e) => setSelectedInvoiceType(e.target.value as InvoiceTypeFilter)}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los tipos</option>
          <option value="A">Factura A</option>
          <option value="B">Factura B</option>
          <option value="AE">Factura AE</option>
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
          <option value="PAID">Pend. Facturar y Pagadas</option>
          <option value="INVOICED_PAID">Fact. y Pagadas</option>
          <option value="CANCELLED">Anuladas</option>
        </select>

        <span className="text-xs text-muted-foreground">
          {filtered.length} ventas
        </span>

        {/* Descargas */}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            onClick={() => downloadSalesExcel(displayedSales, periodLabel, clientLabel)}>
            <FileSpreadsheet className="h-3.5 w-3.5" />Excel
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            onClick={() => downloadSalesPdf(displayedSales, periodLabel, clientLabel)}>
            <FileText className="h-3.5 w-3.5" />PDF
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No hay ventas para el periodo seleccionado.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen de totales */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-4 py-3">
            {selectedStatus === "all" && (
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Facturadas</span>
                  <span className="text-sm font-semibold text-blue-700">{formatCurrency(totalInvoiced)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Pend. Facturar</span>
                  <span className="text-sm font-semibold text-orange-700">{formatCurrency(totalUninvoiced)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Facturadas y Pagadas</span>
                  <span className="text-sm font-semibold text-emerald-700">{formatCurrency(totalInvoicedPaid)}</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Pagado</span>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Saldo</span>
              <span className="text-sm font-semibold text-orange-700">{formatCurrency(totalBalance)}</span>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={handleInvoiceSort}
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted"
                      title="Ordenar por numero de factura"
                    >
                      Nro Factura
                      <ArrowDownUp className={`h-3.5 w-3.5 ${invoiceSortDirection ? "text-primary" : "text-muted-foreground"}`} />
                    </button>
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>OC</TableHead>
                  <TableHead className="text-right">Importes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.clientName ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${invoiceTypeClass(sale.invoiceType)}`}
                        title={INVOICE_TYPE_LABELS[sale.invoiceType]}
                      >
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
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="font-semibold">{formatCurrency(sale.amount)}</span>
                        <span className="text-xs text-green-700">Pagado: {formatCurrency(sale.paidAmount ?? "0")}</span>
                        <span className="text-xs text-orange-700">Saldo: {formatCurrency(sale.balance ?? sale.amount)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABELS[sale.status]}</Badge>
                        {isPaidStatus(sale.status) && sale.paymentDate && (
                          <span className="text-xs text-muted-foreground">
                            Pagada: {formatDate(sale.paymentDate)}
                          </span>
                        )}
                        {sale.status === "CANCELLED" && sale.creditNoteNumber && (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs text-muted-foreground">{sale.creditNoteNumber}</span>
                            {sale.cancellationDate && (
                              <span className="text-xs text-muted-foreground">
                                Anulada: {formatDate(sale.cancellationDate)}
                              </span>
                            )}
                            {sale.creditNoteAmount && (
                              <span className="text-xs font-semibold text-red-700">
                                NC: {formatCurrency(sale.creditNoteAmount)}
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
                                Nota de crédito
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {sale.status !== "CANCELLED" && (
                          <Tooltip label="Pagos">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-green-700 hover:text-green-800"
                              onClick={() => setPaymentsSale(sale)}>
                              <CircleDollarSign className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        )}
                        {(sale.status === "PENDING_INVOICE" || sale.status === "PAID") && (
                          <Tooltip label="Facturar">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-primary hover:text-primary"
                              onClick={() => setInvoiceSaleId(sale.id)}>
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        )}
                        {(sale.status === "INVOICED" || sale.status === "INVOICED_PAID" || sale.status === "PENDING") && (
                          <Tooltip label="Revertir factura">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                              onClick={() => setRevertInvoiceSaleId(sale.id)}>
                              <RotateCcw className="h-3.5 w-3.5" />
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

      <RevertSaleInvoiceDialog
        saleId={revertInvoiceSaleId}
        open={revertInvoiceSaleId !== null}
        onOpenChange={(open) => !open && setRevertInvoiceSaleId(null)}
        onSuccess={() => { setRevertInvoiceSaleId(null); router.refresh(); }}
      />

      <SalePaymentsDialog
        sale={paymentsSale}
        open={paymentsSale !== null}
        onOpenChange={(open) => !open && setPaymentsSale(null)}
        onSuccess={() => router.refresh()}
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
        categories={categories}
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
