import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeFilename(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function periodSlug(periodLabel: string): string {
  return sanitizeFilename(periodLabel);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseRow = {
  provider: string;
  invoiceNumber: string;
  remito: string | null;
  remitoUrl?: string | null;
  date: string;
  paymentMethod: string | null;
  amount: string;
  status: "PENDING" | "PAID";
};

type SaleRow = {
  clientName: string | null;
  invoiceType: "A" | "B" | "AE";
  invoiceNumber: string | null;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  status: "PENDING_INVOICE" | "PENDING" | "INVOICED" | "PAID" | "INVOICED_PAID" | "CANCELLED";
  paymentDate?: string | null;
  items?: Array<{ supplyName: string; quantity: string }>;
};

const PAYMENT_LABELS: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  EFECTIVO: "Efectivo",
};
const PURCHASE_STATUS: Record<string, string> = { PENDING: "Pendiente", PAID: "Pagado" };
const SALE_STATUS: Record<string, string> = {
  PENDING_INVOICE: "Pend. Facturar",
  PENDING: "Facturada",
  INVOICED: "Facturada",
  PAID: "Pend. Facturar y Pagada",
  INVOICED_PAID: "Facturada y Pagada",
  CANCELLED: "Anulada",
};

// ─── Purchases Excel ─────────────────────────────────────────────────────────

export function downloadPurchasesExcel(
  purchases: PurchaseRow[],
  periodLabel: string,
  providerLabel: string
) {
  const data = purchases.map((p) => ({
    Proveedor: p.provider,
    "Nº Factura": p.invoiceNumber,
    Remito: p.remito ?? "",
    Fecha: formatDate(p.date),
    "Medio de Pago": p.paymentMethod ? (PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod) : "",
    Monto: parseFloat(p.amount),
    Estado: PURCHASE_STATUS[p.status] ?? p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  // Set column widths
  ws["!cols"] = [
    { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Compras");
  XLSX.writeFile(
    wb,
    `compras-${sanitizeFilename(providerLabel)}-${periodSlug(periodLabel)}.xlsx`
  );
}

// ─── Purchases PDF ───────────────────────────────────────────────────────────

export function downloadPurchasesPdf(
  purchases: PurchaseRow[],
  periodLabel: string,
  providerLabel: string
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`Compras — ${periodLabel}`, 14, 16);
  if (providerLabel !== "todos") {
    doc.setFontSize(10);
    doc.text(`Proveedor: ${providerLabel}`, 14, 23);
  }

  const totalPaid = purchases
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalPending = purchases
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + parseFloat(p.amount), 0);

  autoTable(doc, {
    startY: providerLabel !== "todos" ? 27 : 22,
    head: [["Proveedor", "Nº Factura", "Remito", "Fecha", "Medio de Pago", "Monto", "Estado"]],
    body: [
      ...purchases.map((p) => [
        p.provider,
        p.invoiceNumber,
        p.remito ?? "—",
        formatDate(p.date),
        p.paymentMethod ? (PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod) : "—",
        formatCurrency(p.amount),
        PURCHASE_STATUS[p.status] ?? p.status,
      ]),
      ["", "", "", "", "Subtotal Pagado", formatCurrency(totalPaid), ""],
      ["", "", "", "", "Subtotal Pendiente", formatCurrency(totalPending), ""],
      ["", "", "", "", "Total", formatCurrency(totalPaid + totalPending), ""],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(`compras-${sanitizeFilename(providerLabel)}-${periodSlug(periodLabel)}.pdf`);
}

// ─── Sales Excel ──────────────────────────────────────────────────────────────

export function downloadSalesExcel(
  sales: SaleRow[],
  periodLabel: string,
  clientLabel: string
) {
  const data = sales.map((s) => ({
    Cliente: s.clientName ?? "",
    "Tipo Factura": `Factura ${s.invoiceType}`,
    "Nº Factura": s.invoiceNumber ?? "",
    Fecha: formatDate(s.date),
    Paciente: s.patient ?? "",
    OC: s.oc ?? "",
    Insumos: s.items?.length
      ? s.items.map((i) => `${i.supplyName} x${i.quantity}`).join(", ")
      : "",
    Monto: parseFloat(s.amount),
    Estado: SALE_STATUS[s.status] ?? s.status,
    "Fecha Pago": s.paymentDate ? formatDate(s.paymentDate) : "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  XLSX.writeFile(
    wb,
    `ventas-${sanitizeFilename(clientLabel)}-${periodSlug(periodLabel)}.xlsx`
  );
}

// ─── Sales PDF ────────────────────────────────────────────────────────────────

export function downloadSalesPdf(
  sales: SaleRow[],
  periodLabel: string,
  clientLabel: string
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`Ventas — ${periodLabel}`, 14, 16);
  if (clientLabel !== "todos") {
    doc.setFontSize(10);
    doc.text(`Cliente: ${clientLabel}`, 14, 23);
  }

  const totalPaid = sales
    .filter((s) => s.status === "PAID" || s.status === "INVOICED_PAID")
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const totalPending = sales
    .filter((s) => s.status === "INVOICED" || s.status === "PENDING" || s.status === "PENDING_INVOICE")
    .reduce((sum, s) => sum + parseFloat(s.amount), 0);

  autoTable(doc, {
    startY: clientLabel !== "todos" ? 27 : 22,
    head: [["Cliente", "Tipo", "Nº Factura", "Fecha", "Paciente", "OC", "Insumos", "Monto", "Estado", "Fecha Pago"]],
    body: [
      ...sales.map((s) => [
        s.clientName ?? "—",
        `Factura ${s.invoiceType}`,
        s.invoiceNumber ?? "—",
        formatDate(s.date),
        s.patient ?? "—",
        s.oc ?? "—",
        s.items?.length
          ? s.items.map((i) => `${i.supplyName} x${i.quantity}`).join(", ")
          : "—",
        formatCurrency(s.amount),
        SALE_STATUS[s.status] ?? s.status,
        s.paymentDate ? formatDate(s.paymentDate) : "—",
      ]),
      ["", "", "", "", "", "Subtotal Pagadas", "", formatCurrency(totalPaid), "", ""],
      ["", "", "", "", "", "Subtotal Pendiente", "", formatCurrency(totalPending), "", ""],
      ["", "", "", "", "", "Total", "", formatCurrency(totalPaid + totalPending), "", ""],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(`ventas-${sanitizeFilename(clientLabel)}-${periodSlug(periodLabel)}.pdf`);
}
