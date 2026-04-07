"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, isNull } from "drizzle-orm";
import {
  mockGetSalesWithClients,
  mockCreateSale,
  mockMarkSaleAsPaid,
  mockCancelSale,
  mockUpdateSale,
  mockSoftDeleteSale,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { sales, clients } from "@/db/schema";
import { createSaleSchema, cancelSaleSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getSalesWithClients() {
  if (USE_MOCK) return mockGetSalesWithClients();

  return getDb()
    .select({
      id: sales.id,
      clientId: sales.clientId,
      clientName: clients.name,
      invoiceType: sales.invoiceType,
      invoiceNumber: sales.invoiceNumber,
      date: sales.date,
      oc: sales.oc,
      patient: sales.patient,
      amount: sales.amount,
      status: sales.status,
      documentUrl: sales.documentUrl,
      creditNoteNumber: sales.creditNoteNumber,
      creditNoteUrl: sales.creditNoteUrl,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(isNull(sales.deletedAt))
    .orderBy(desc(sales.date));
}

export async function createSale(input: unknown) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockCreateSale(parsed.data);
  } else {
    const { documentUrl, oc, patient, ...rest } = parsed.data;
    await getDb().insert(sales).values({
      ...rest,
      oc: oc || null,
      patient: patient || null,
      documentUrl: documentUrl || null,
    });
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSale(id: string, input: unknown) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockUpdateSale(id, parsed.data);
  } else {
    const { documentUrl, oc, patient, ...rest } = parsed.data;
    await getDb().update(sales).set({
      ...rest,
      oc: oc || null,
      patient: patient || null,
      documentUrl: documentUrl || null,
    }).where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSale(id: string) {
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
  if (USE_MOCK) {
    mockMarkSaleAsPaid(id);
  } else {
    await getDb().update(sales).set({ status: "PAID" }).where(eq(sales.id, id));
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

  if (USE_MOCK) {
    mockCancelSale(id, parsed.data);
  } else {
    await getDb()
      .update(sales)
      .set({
        status: "CANCELLED",
        creditNoteNumber: parsed.data.creditNoteNumber,
        creditNoteUrl: parsed.data.creditNoteUrl,
      })
      .where(eq(sales.id, id));
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { success: true };
}
