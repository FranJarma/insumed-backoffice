"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import {
  mockCancelSale,
  mockCreateSale,
  mockGetSalesWithClients,
  mockMarkSaleAsDelivered,
  mockMarkSaleAsInvoiced,
  mockMarkSaleAsPaid,
  mockRevertSaleDelivery,
  mockSoftDeleteSale,
  mockUpdateSale,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { clients, saleItems, sales, supplies } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { deleteR2Object } from "@/lib/r2";
import {
  cancelSaleSchema,
  createSaleSchema,
  markSaleAsInvoicedSchema,
  type SaleItemInput,
} from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";
const CANCELLABLE_SALE_STATUSES = ["INVOICED", "PAID"] as const;
const CANCEL_ONLY_INVOICED_ERROR = "Solo se pueden anular facturas de ventas facturadas.";

function canCancelSale(status: string | null | undefined) {
  return !!status && CANCELLABLE_SALE_STATUSES.includes(status as (typeof CANCELLABLE_SALE_STATUSES)[number]);
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
      deliveredAt: sales.deliveredAt,
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

  const auth = await authorizeAction("sales:create");
  if ("error" in auth) {
    return auth;
  }

  const { isInvoiced, documentUrl, oc, patient, invoiceNumber, invoiceDate, ...rest } = parsed.data;
  const status = isInvoiced ? "INVOICED" : "PENDING_INVOICE";

  if (USE_MOCK) {
    mockCreateSale(
      { ...rest, invoiceNumber: invoiceNumber || undefined, invoiceDate, oc, patient, documentUrl, isInvoiced },
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
        oc: oc || null,
        patient: patient || null,
        documentUrl: documentUrl || null,
        status,
      })
      .returning({ id: sales.id });

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

  const { isInvoiced, documentUrl, oc, patient, invoiceNumber, invoiceDate, ...rest } = parsed.data;

  if (USE_MOCK) {
    mockUpdateSale(
      id,
      { ...rest, invoiceNumber: invoiceNumber || undefined, invoiceDate, oc, patient, documentUrl, isInvoiced },
      items
    );
  } else {
    const db = getDb();
    const existingSale = await getExistingSale(id);
    if (!existingSale) {
      return { error: { _form: ["Venta no encontrada"] } };
    }

    let newStatus = existingSale.status;
    if (newStatus === "PENDING_INVOICE" || newStatus === "INVOICED" || newStatus === "PENDING") {
      newStatus = isInvoiced ? "INVOICED" : "PENDING_INVOICE";
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

export async function markSaleAsPaid(id: string) {
  const auth = await authorizeAction("sales:update");
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    mockMarkSaleAsPaid(id);
  } else {
    await getDb().update(sales).set({ status: "PAID" }).where(eq(sales.id, id));
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
        status: "INVOICED",
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
