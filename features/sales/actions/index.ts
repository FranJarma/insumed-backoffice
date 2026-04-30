"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  mockCancelSale,
  mockCreateSalePayment,
  mockCreateSale,
  mockDeleteSalePayment,
  mockGetSalesWithClients,
  mockMarkSaleAsDelivered,
  mockMarkSaleAsInvoiced,
  mockMarkSaleAsPaid,
  mockRevertSaleInvoice,
  mockRevertSaleDelivery,
  mockSoftDeleteSale,
  mockUpdateSale,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { clients, saleItems, salePayments, sales, supplies } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { deleteR2Object } from "@/lib/r2";
import {
  cancelSaleSchema,
  createSaleSchema,
  markSaleAsInvoicedSchema,
  markSaleAsPaidSchema,
  salePaymentSchema,
  type SaleItemInput,
} from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";
const CANCELLABLE_SALE_STATUSES = ["INVOICED", "PAID", "INVOICED_PAID", "PENDING"] as const;
const CANCEL_ONLY_INVOICED_ERROR = "Solo se pueden anular facturas de ventas facturadas.";

function canCancelSale(status: string | null | undefined) {
  return !!status && CANCELLABLE_SALE_STATUSES.includes(status as (typeof CANCELLABLE_SALE_STATUSES)[number]);
}

function resolveSaleStatus(isInvoiced: boolean, isPaid: boolean) {
  if (isInvoiced && isPaid) return "INVOICED_PAID";
  if (isPaid) return "PAID";
  if (isInvoiced) return "INVOICED";
  return "PENDING_INVOICE";
}

function getPaymentSummary(amount: string, payments: Array<{ amount: string }>) {
  const paidAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const saleAmount = parseFloat(amount);
  return {
    paidAmount: paidAmount.toFixed(2),
    balance: Math.max(saleAmount - paidAmount, 0).toFixed(2),
    paymentStatus: paidAmount <= 0 ? "UNPAID" : paidAmount >= saleAmount ? "PAID" : "PARTIALLY_PAID",
  };
}

function resolveInvoiceDate(params: {
  isInvoiced: boolean;
  invoiceDate?: string;
  saleDate: string;
  existingInvoiceDate?: string | null;
}) {
  if (!params.isInvoiced) {
    return null;
  }

  return params.invoiceDate || params.existingInvoiceDate || params.saleDate;
}

async function getExistingSale(id: string) {
  const [sale] = await getDb()
    .select({
      status: sales.status,
      amount: sales.amount,
      paymentDate: sales.paymentDate,
      invoiceDate: sales.invoiceDate,
      documentUrl: sales.documentUrl,
      creditNoteUrl: sales.creditNoteUrl,
    })
    .from(sales)
    .where(eq(sales.id, id))
    .limit(1);

  return sale ?? null;
}

export async function getSalesWithClients() {
  await requirePermission("sales:read");
  if (USE_MOCK) {
    return mockGetSalesWithClients();
  }

  const salesList = await getDb()
    .select({
      id: sales.id,
      clientId: sales.clientId,
      clientName: clients.name,
      invoiceType: sales.invoiceType,
      invoiceNumber: sales.invoiceNumber,
      invoiceDate: sales.invoiceDate,
      date: sales.date,
      oc: sales.oc,
      patient: sales.patient,
      amount: sales.amount,
      status: sales.status,
      paymentDate: sales.paymentDate,
      documentUrl: sales.documentUrl,
      creditNoteNumber: sales.creditNoteNumber,
      creditNoteAmount: sales.creditNoteAmount,
      cancellationDate: sales.cancellationDate,
      creditNoteUrl: sales.creditNoteUrl,
      deliveredAt: sales.deliveredAt,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(isNull(sales.deletedAt))
    .orderBy(desc(sales.date));

  const saleIds = salesList.map((sale) => sale.id);
  const payments =
    saleIds.length > 0
      ? await getDb()
          .select({
            id: salePayments.id,
            saleId: salePayments.saleId,
            amount: salePayments.amount,
            paymentDate: salePayments.paymentDate,
            paymentMethod: salePayments.paymentMethod,
            reference: salePayments.reference,
            notes: salePayments.notes,
            receiptUrl: salePayments.receiptUrl,
            createdAt: salePayments.createdAt,
          })
          .from(salePayments)
          .where(and(inArray(salePayments.saleId, saleIds), isNull(salePayments.deletedAt)))
      : [];

  return salesList.map((sale) => {
    const salePaymentList = payments
      .filter((payment) => payment.saleId === sale.id)
      .sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)));
    return {
      ...sale,
      payments: salePaymentList,
      ...getPaymentSummary(sale.amount, salePaymentList),
    };
  });
}

export async function createSale(input: unknown, items: SaleItemInput[] = []) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("sales:create");
  if ("error" in auth) {
    return auth;
  }

  const { isInvoiced, isPaid, paymentDate, documentUrl, oc, patient, invoiceNumber, invoiceDate, ...rest } = parsed.data;
  const status = resolveSaleStatus(isInvoiced, isPaid);

  if (USE_MOCK) {
    mockCreateSale(
      { ...rest, invoiceNumber: invoiceNumber || undefined, invoiceDate, oc, patient, documentUrl, isInvoiced, isPaid, paymentDate },
      items
    );
  } else {
    const db = getDb();
    const [newSale] = await db
      .insert(sales)
      .values({
        ...rest,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: isInvoiced ? invoiceDate || rest.date : null,
        paymentDate: isPaid ? paymentDate || rest.date : null,
        oc: oc || null,
        patient: patient || null,
        documentUrl: documentUrl || null,
        status,
      })
      .returning({ id: sales.id });

    if (isPaid) {
      await db.insert(salePayments).values({
        saleId: newSale.id,
        amount: rest.amount,
        paymentDate: paymentDate || rest.date,
        notes: "Pago registrado al crear la venta",
      });
    }

    if (items.length > 0) {
      await db.insert(saleItems).values(
        items.map((item) => ({
          saleId: newSale.id,
          supplyId: item.supplyId || null,
          pm: item.pm,
          supplyName: item.supplyName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          priceWithVat: item.priceWithVat || null,
          subtotal: item.subtotal,
        }))
      );

      const supplyIds = items.map((i) => i.supplyId).filter(Boolean) as string[];
      if (supplyIds.length > 0) {
        await db.update(supplies).set({ status: "en_entrega" }).where(inArray(supplies.id, supplyIds));
      }
    }
  }

  revalidatePath("/sales");
  revalidatePath("/supplies");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSale(id: string, input: unknown, items: SaleItemInput[] = []) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  const { isInvoiced, isPaid, paymentDate, documentUrl, oc, patient, invoiceNumber, invoiceDate, ...rest } = parsed.data;

  if (USE_MOCK) {
    mockUpdateSale(
      id,
      { ...rest, invoiceNumber: invoiceNumber || undefined, invoiceDate, oc, patient, documentUrl, isInvoiced, isPaid, paymentDate },
      items
    );
  } else {
    const db = getDb();
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }

    let newStatus = existingSale.status;
    if (newStatus === "PENDING_INVOICE" || newStatus === "INVOICED" || newStatus === "PAID" || newStatus === "INVOICED_PAID" || newStatus === "PENDING") {
      newStatus = resolveSaleStatus(isInvoiced, isPaid);
    }

    const nextDocumentUrl =
      documentUrl === undefined ? existingSale.documentUrl : documentUrl || null;

    await db
      .update(sales)
      .set({
        ...rest,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: resolveInvoiceDate({
          isInvoiced,
          invoiceDate,
          saleDate: rest.date,
          existingInvoiceDate: existingSale.invoiceDate,
        }),
        paymentDate: isPaid ? paymentDate || existingSale.paymentDate || rest.date : null,
        oc: oc || null,
        patient: patient || null,
        documentUrl: nextDocumentUrl,
        status: newStatus,
      })
      .where(eq(sales.id, id));

    const oldItems = await db
      .select({ supplyId: saleItems.supplyId })
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    await db.delete(saleItems).where(eq(saleItems.saleId, id));

    const oldSupplyIds = oldItems.map((i) => i.supplyId).filter(Boolean) as string[];
    if (oldSupplyIds.length > 0) {
      await db.update(supplies).set({ status: "en_deposito" }).where(inArray(supplies.id, oldSupplyIds));
    }

    if (items.length > 0) {
      await db.insert(saleItems).values(
        items.map((item) => ({
          saleId: id,
          supplyId: item.supplyId || null,
          pm: item.pm,
          supplyName: item.supplyName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          priceWithVat: item.priceWithVat || null,
          subtotal: item.subtotal,
        }))
      );

      const newSupplyIds = items.map((i) => i.supplyId).filter(Boolean) as string[];
      if (newSupplyIds.length > 0) {
        await db.update(supplies).set({ status: "en_entrega" }).where(inArray(supplies.id, newSupplyIds));
      }
    }

    if (
      existingSale.documentUrl &&
      nextDocumentUrl &&
      existingSale.documentUrl !== nextDocumentUrl
    ) {
      await deleteR2Object(existingSale.documentUrl).catch((error) => {
        console.error("[sales.updateSale.deleteOldDocument]", error);
      });
    }
  }

  revalidatePath("/sales");
  revalidatePath("/supplies");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSale(id: string) {
  const auth = await authorizeAction("sales:delete");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    mockSoftDeleteSale(id);
  } else {
    const db = getDb();
    const saleItemsList = await db.select({ supplyId: saleItems.supplyId }).from(saleItems).where(eq(saleItems.saleId, id));
    const supplyIds = saleItemsList.map((i) => i.supplyId).filter(Boolean) as string[];
    if (supplyIds.length > 0) {
      await db.update(supplies).set({ status: "en_deposito" }).where(inArray(supplies.id, supplyIds));
    }
    await db.update(sales).set({ deletedAt: new Date() }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/supplies");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markSaleAsPaid(id: string, input: unknown) {
  const parsed = markSaleAsPaidSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    const sale = mockGetSalesWithClients().find((item) => item.id === id);
    if (!sale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (sale.status === "CANCELLED") {
      return { error: { _form: ["No se puede marcar como pagada una venta anulada"] } };
    }
    mockMarkSaleAsPaid(id, parsed.data);
  } else {
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (existingSale.status === "CANCELLED") {
      return { error: { _form: ["No se puede marcar como pagada una venta anulada"] } };
    }
    const status = existingSale.status === "INVOICED" || existingSale.status === "PENDING" ? "INVOICED_PAID" : "PAID";
    const [saleAmount] = await getDb().select({ amount: sales.amount }).from(sales).where(eq(sales.id, id)).limit(1);
    const existingPayments = await getDb()
      .select({ amount: salePayments.amount })
      .from(salePayments)
      .where(and(eq(salePayments.saleId, id), isNull(salePayments.deletedAt)));
    if (saleAmount && existingPayments.length === 0) {
      await getDb().insert(salePayments).values({
        saleId: id,
        amount: saleAmount.amount,
        paymentDate: parsed.data.paymentDate,
        notes: "Pago registrado al marcar la venta como pagada",
      });
    }
    await getDb()
      .update(sales)
      .set({ status, paymentDate: parsed.data.paymentDate })
      .where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

async function syncSalePaymentState(id: string) {
  const [sale] = await getDb()
    .select({
      status: sales.status,
      amount: sales.amount,
      invoiceNumber: sales.invoiceNumber,
    })
    .from(sales)
    .where(eq(sales.id, id))
    .limit(1);

  if (!sale || sale.status === "CANCELLED") return;

  const payments = await getDb()
    .select({
      amount: salePayments.amount,
      paymentDate: salePayments.paymentDate,
    })
    .from(salePayments)
    .where(and(eq(salePayments.saleId, id), isNull(salePayments.deletedAt)));

  const activePayments = payments.filter(Boolean);
  const paidAmount = activePayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const saleAmount = parseFloat(sale.amount);
  const isInvoiced = !!sale.invoiceNumber || sale.status === "PENDING";
  const paymentDate = activePayments.sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)))[0]?.paymentDate ?? null;

  let status = sale.status;
  if (paidAmount <= 0) {
    status = isInvoiced ? "INVOICED" : "PENDING_INVOICE";
  } else if (paidAmount >= saleAmount) {
    status = isInvoiced ? "INVOICED_PAID" : "PAID";
  } else {
    status = isInvoiced ? "INVOICED" : "PENDING_INVOICE";
  }

  await getDb().update(sales).set({ status, paymentDate }).where(eq(sales.id, id));
}

export async function createSalePayment(id: string, input: unknown) {
  const parsed = salePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    const sale = mockGetSalesWithClients().find((item) => item.id === id);
    if (!sale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (sale.status === "CANCELLED") {
      return { error: { _form: ["No se pueden registrar pagos en una venta anulada"] } };
    }
    const nextPaid = parseFloat(sale.paidAmount ?? "0") + parseFloat(parsed.data.amount);
    if (nextPaid > parseFloat(sale.amount) + 0.001) {
      return { error: { amount: ["El pago supera el saldo pendiente"] } };
    }
    mockCreateSalePayment(id, parsed.data);
  } else {
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (existingSale.status === "CANCELLED") {
      return { error: { _form: ["No se pueden registrar pagos en una venta anulada"] } };
    }

    const existingPayments = await getDb()
      .select({ amount: salePayments.amount })
      .from(salePayments)
      .where(and(eq(salePayments.saleId, id), isNull(salePayments.deletedAt)));
    const currentPaid = existingPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    if (currentPaid + parseFloat(parsed.data.amount) > parseFloat(existingSale.amount) + 0.001) {
      return { error: { amount: ["El pago supera el saldo pendiente"] } };
    }

    await getDb().insert(salePayments).values({
      saleId: id,
      amount: parsed.data.amount,
      paymentDate: parsed.data.paymentDate,
      paymentMethod: parsed.data.paymentMethod || null,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
      receiptUrl: parsed.data.receiptUrl || null,
    });
    await syncSalePaymentState(id);
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSalePayment(id: string) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    mockDeleteSalePayment(id);
  } else {
    const [payment] = await getDb()
      .select({ saleId: salePayments.saleId })
      .from(salePayments)
      .where(eq(salePayments.id, id))
      .limit(1);
    if (!payment) {
      return { error: { _form: ["Pago no encontrado"] } };
    }
    await getDb().update(salePayments).set({ deletedAt: new Date() }).where(eq(salePayments.id, id));
    await syncSalePaymentState(payment.saleId);
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markSaleAsInvoiced(id: string, input: unknown) {
  const parsed = markSaleAsInvoicedSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    mockMarkSaleAsInvoiced(id, parsed.data);
  } else {
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }

    const nextDocumentUrl =
      parsed.data.documentUrl === undefined ? existingSale.documentUrl : parsed.data.documentUrl || null;

    await getDb()
      .update(sales)
      .set({
        status: existingSale.status === "PAID" ? "INVOICED_PAID" : "INVOICED",
        invoiceNumber: parsed.data.invoiceNumber,
        invoiceDate: parsed.data.invoiceDate,
        documentUrl: nextDocumentUrl,
      })
      .where(eq(sales.id, id));

    if (
      existingSale.documentUrl &&
      nextDocumentUrl &&
      existingSale.documentUrl !== nextDocumentUrl
    ) {
      await deleteR2Object(existingSale.documentUrl).catch((error) => {
        console.error("[sales.markSaleAsInvoiced.deleteOldDocument]", error);
      });
    }
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function revertSaleInvoice(id: string) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    const sale = mockGetSalesWithClients().find((item) => item.id === id);
    if (!sale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (sale.status !== "INVOICED" && sale.status !== "INVOICED_PAID" && sale.status !== "PENDING") {
      return { error: { _form: ["Solo se pueden revertir facturas de ventas facturadas"] } };
    }
    mockRevertSaleInvoice(id);
  } else {
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (existingSale.status !== "INVOICED" && existingSale.status !== "INVOICED_PAID" && existingSale.status !== "PENDING") {
      return { error: { _form: ["Solo se pueden revertir facturas de ventas facturadas"] } };
    }

    await getDb()
      .update(sales)
      .set({
        invoiceNumber: null,
        invoiceDate: null,
        documentUrl: null,
      })
      .where(eq(sales.id, id));

    await syncSalePaymentState(id);

    if (existingSale.documentUrl) {
      await deleteR2Object(existingSale.documentUrl).catch((error) => {
        console.error("[sales.revertSaleInvoice.deleteDocument]", error);
      });
    }
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markSaleAsDelivered(id: string) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockMarkSaleAsDelivered(id);
  } else {
    const db = getDb();
    const saleItemsList = await db
      .select({ supplyId: saleItems.supplyId })
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    const supplyIds = saleItemsList.map((i) => i.supplyId).filter(Boolean) as string[];
    if (supplyIds.length > 0) {
      await db.update(supplies).set({ status: "entregado" }).where(inArray(supplies.id, supplyIds));
    }
    await db.update(sales).set({ deliveredAt: new Date() }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/supplies");
  return { success: true };
}

export async function revertSaleDelivery(id: string) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockRevertSaleDelivery(id);
  } else {
    const db = getDb();
    const saleItemsList = await db
      .select({ supplyId: saleItems.supplyId })
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    const supplyIds = saleItemsList.map((i) => i.supplyId).filter(Boolean) as string[];
    if (supplyIds.length > 0) {
      await db.update(supplies).set({ status: "en_deposito" }).where(inArray(supplies.id, supplyIds));
    }
    await db.update(sales).set({ deliveredAt: null }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/supplies");
  return { success: true };
}

export async function cancelSale(id: string, input: unknown) {
  const parsed = cancelSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    const sale = mockGetSalesWithClients().find((item) => item.id === id);
    if (!canCancelSale(sale?.status)) {
      return { error: { _form: [CANCEL_ONLY_INVOICED_ERROR] } };
    }

    mockCancelSale(id, parsed.data);
  } else {
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }
    if (!canCancelSale(existingSale.status)) {
      return { error: { _form: [CANCEL_ONLY_INVOICED_ERROR] } };
    }

    const db = getDb();
    const saleItemsList = await db.select({ supplyId: saleItems.supplyId }).from(saleItems).where(eq(saleItems.saleId, id));
    const supplyIds = saleItemsList.map((i) => i.supplyId).filter(Boolean) as string[];
    if (supplyIds.length > 0) {
      await db.update(supplies).set({ status: "en_deposito" }).where(inArray(supplies.id, supplyIds));
    }

    await db
      .update(sales)
      .set({
        status: "CANCELLED",
        creditNoteNumber: parsed.data.creditNoteNumber,
        creditNoteAmount: parsed.data.creditNoteAmount,
        cancellationDate: parsed.data.cancellationDate,
        creditNoteUrl: parsed.data.creditNoteUrl || null,
      })
      .where(eq(sales.id, id));

    if (
      existingSale.creditNoteUrl &&
      parsed.data.creditNoteUrl &&
      existingSale.creditNoteUrl !== parsed.data.creditNoteUrl
    ) {
      await deleteR2Object(existingSale.creditNoteUrl).catch((error) => {
        console.error("[sales.cancelSale.deleteOldCreditNote]", error);
      });
    }
  }

  revalidatePath("/sales");
  revalidatePath("/supplies");
  revalidatePath("/dashboard");
  return { success: true };
}
