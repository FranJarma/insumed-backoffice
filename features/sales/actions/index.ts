"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, isNull } from "drizzle-orm";
import {
  mockGetSalesWithClients,
  mockCreateSale,
  mockMarkSaleAsPaid,
  mockMarkSaleAsInvoiced,
  mockCancelSale,
  mockUpdateSale,
  mockSoftDeleteSale,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { sales, clients, saleItems } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { createSaleSchema, cancelSaleSchema, type SaleItemInput } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";
const CANCELLABLE_SALE_STATUSES = ["INVOICED", "PAID", "PENDING"] as const;
const CANCEL_ONLY_INVOICED_ERROR = "Solo se pueden anular facturas de ventas facturadas.";
const REQUIRED_SALE_ITEMS_ERROR = "Agregá al menos un insumo para continuar.";

function hasRequiredSaleItems(items: SaleItemInput[]) {
  return items.length > 0;
}

function canCancelSale(status: string | null | undefined) {
  return !!status && CANCELLABLE_SALE_STATUSES.includes(status as (typeof CANCELLABLE_SALE_STATUSES)[number]);
}

function resolveInvoiceDate(params: {
  isInvoiced: boolean;
  invoiceDate?: string;
  saleDate: string;
  existingInvoiceDate?: string | null;
}) {
  if (!params.isInvoiced) return null;
  return params.invoiceDate || params.existingInvoiceDate || params.saleDate;
}

export async function getSalesWithClients() {
  await requirePermission("sales:read");
  if (USE_MOCK) return mockGetSalesWithClients();

  return getDb()
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
      documentUrl: sales.documentUrl,
      creditNoteNumber: sales.creditNoteNumber,
      cancellationDate: sales.cancellationDate,
      creditNoteUrl: sales.creditNoteUrl,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(isNull(sales.deletedAt))
    .orderBy(desc(sales.date));
}

export async function createSale(input: unknown, items: SaleItemInput[] = []) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  if (!hasRequiredSaleItems(items)) {
    return { error: { items: [REQUIRED_SALE_ITEMS_ERROR] } };
  }
  const auth = await authorizeAction("sales:create");
  if ("error" in auth) return auth;

  const { isInvoiced, documentUrl, oc, patient, invoiceNumber, invoiceDate, ...rest } = parsed.data;
  const status = isInvoiced ? "INVOICED" : "PENDING_INVOICE";

  if (USE_MOCK) {
    mockCreateSale({ ...rest, invoiceNumber: invoiceNumber || undefined, invoiceDate, oc, patient, documentUrl, isInvoiced }, items);
  } else {
    const db = getDb();
    const [newSale] = await db.insert(sales).values({
      ...rest,
      invoiceNumber: invoiceNumber || null,
      invoiceDate: isInvoiced ? (invoiceDate || rest.date) : null,
      oc: oc || null,
      patient: patient || null,
      documentUrl: documentUrl || null,
      status,
    }).returning({ id: sales.id });

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
    }
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSale(id: string, input: unknown, items: SaleItemInput[] = []) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  if (!hasRequiredSaleItems(items)) {
    return { error: { items: [REQUIRED_SALE_ITEMS_ERROR] } };
  }
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) return auth;

  const { isInvoiced, documentUrl, oc, patient, invoiceNumber, invoiceDate, ...rest } = parsed.data;

  if (USE_MOCK) {
    mockUpdateSale(id, { ...rest, invoiceNumber: invoiceNumber || undefined, invoiceDate, oc, patient, documentUrl, isInvoiced }, items);
  } else {
    const db = getDb();

    // Only update status if not already in a terminal state
    const [existing] = await db
      .select({ status: sales.status, invoiceDate: sales.invoiceDate })
      .from(sales)
      .where(eq(sales.id, id));
    let newStatus = existing?.status;
    if (newStatus === "PENDING_INVOICE" || newStatus === "INVOICED" || newStatus === "PENDING") {
      newStatus = isInvoiced ? "INVOICED" : "PENDING_INVOICE";
    }

    await db.update(sales).set({
      ...rest,
      invoiceNumber: invoiceNumber || null,
      invoiceDate: resolveInvoiceDate({
        isInvoiced,
        invoiceDate,
        saleDate: rest.date,
        existingInvoiceDate: existing?.invoiceDate,
      }),
      oc: oc || null,
      patient: patient || null,
      documentUrl: documentUrl || null,
      status: newStatus,
    }).where(eq(sales.id, id));

    // Replace items
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
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
    }
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSale(id: string) {
  const auth = await authorizeAction("sales:delete");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockSoftDeleteSale(id);
  } else {
    await getDb().update(sales).set({ deletedAt: new Date() }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markSaleAsPaid(id: string) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockMarkSaleAsPaid(id);
  } else {
    await getDb().update(sales).set({ status: "PAID" }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markSaleAsInvoiced(id: string, data: { invoiceNumber: string; invoiceDate: string; documentUrl?: string }) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockMarkSaleAsInvoiced(id, data);
  } else {
    await getDb().update(sales).set({
      status: "INVOICED",
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      documentUrl: data.documentUrl || null,
    }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelSale(id: string, input: unknown) {
  const parsed = cancelSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    const sale = mockGetSalesWithClients().find((item) => item.id === id);
    if (!canCancelSale(sale?.status)) {
      return { error: { _form: [CANCEL_ONLY_INVOICED_ERROR] } };
    }
    mockCancelSale(id, parsed.data);
  } else {
    const [existingSale] = await getDb().select({ status: sales.status }).from(sales).where(eq(sales.id, id));
    if (!canCancelSale(existingSale?.status)) {
      return { error: { _form: [CANCEL_ONLY_INVOICED_ERROR] } };
    }
    await getDb()
      .update(sales)
      .set({
        status: "CANCELLED",
        creditNoteNumber: parsed.data.creditNoteNumber,
        cancellationDate: parsed.data.cancellationDate,
        creditNoteUrl: parsed.data.creditNoteUrl,
      })
      .where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}
