"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, isNull } from "drizzle-orm";
import {
  mockCreatePurchase,
  mockGetPurchases,
  mockMarkPurchaseAsPaid,
  mockRevertPurchasePayment,
  mockSoftDeletePurchase,
  mockUpdatePurchase,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { purchases } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { deleteR2Object } from "@/lib/r2";
import { createPurchaseSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

function getPurchasePermission(category: "PROVEEDOR" | "VARIOS", action: "read" | "create" | "update" | "delete") {
  return (category === "VARIOS" ? `misc_purchases:${action}` : `purchases:${action}`) as Permission;
}

async function getExistingPurchase(id: string) {
  const [purchase] = await getDb()
    .select({
      category: purchases.category,
      remitoUrl: purchases.remitoUrl,
      status: purchases.status,
    })
    .from(purchases)
    .where(eq(purchases.id, id))
    .limit(1);

  return purchase ?? null;
}

export async function getPurchases(category?: "PROVEEDOR" | "VARIOS") {
  await requirePermission(getPurchasePermission(category ?? "PROVEEDOR", "read"));
  if (USE_MOCK) {
    const all = mockGetPurchases();
    return category ? all.filter((purchase) => purchase.category === category) : all;
  }

  const query = getDb().select().from(purchases).where(isNull(purchases.deletedAt)).orderBy(desc(purchases.date));
  if (category) {
    return (await query).filter((purchase) => purchase.category === category);
  }

  return query;
}

export async function createPurchase(input: unknown) {
  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction(getPurchasePermission(parsed.data.category, "create"));
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    mockCreatePurchase(parsed.data);
  } else {
    await getDb().insert(purchases).values({
      ...parsed.data,
      paymentMethod: parsed.data.paymentMethod || null,
      remito: parsed.data.remito || null,
      remitoUrl: parsed.data.remitoUrl || null,
      category: parsed.data.category,
    });
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updatePurchase(id: string, input: unknown) {
  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    const auth = await authorizeAction(getPurchasePermission(parsed.data.category, "update"));
    if ("error" in auth) {
      return auth;
    }

    mockUpdatePurchase(id, parsed.data);
  } else {
    const existingPurchase = await getExistingPurchase(id);
    if (!existingPurchase) {
      return { error: { _form: ["Compra no encontrada"] } };
    }

    const auth = await authorizeAction(getPurchasePermission(existingPurchase.category, "update"));
    if ("error" in auth) {
      return auth;
    }

    const nextRemitoUrl =
      parsed.data.remitoUrl === undefined ? existingPurchase.remitoUrl : parsed.data.remitoUrl || null;

    await getDb()
      .update(purchases)
      .set({
        provider: parsed.data.provider,
        invoiceNumber: parsed.data.invoiceNumber,
        date: parsed.data.date,
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod || null,
        remito: parsed.data.remito || null,
        remitoUrl: nextRemitoUrl,
        category: existingPurchase.category,
      })
      .where(eq(purchases.id, id));

    if (
      existingPurchase.remitoUrl &&
      nextRemitoUrl &&
      existingPurchase.remitoUrl !== nextRemitoUrl
    ) {
      await deleteR2Object(existingPurchase.remitoUrl).catch((error) => {
        console.error("[purchases.updatePurchase.deleteOldRemito]", error);
      });
    }
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deletePurchase(id: string) {
  if (USE_MOCK) {
    const purchase = mockGetPurchases().find((item) => item.id === id);
    const auth = await authorizeAction(getPurchasePermission(purchase?.category ?? "PROVEEDOR", "delete"));
    if ("error" in auth) {
      return auth;
    }

    mockSoftDeletePurchase(id);
  } else {
    const existingPurchase = await getExistingPurchase(id);
    if (!existingPurchase) {
      return { error: { _form: ["Compra no encontrada"] } };
    }

    const auth = await authorizeAction(getPurchasePermission(existingPurchase.category, "delete"));
    if ("error" in auth) {
      return auth;
    }

    await getDb().update(purchases).set({ deletedAt: new Date() }).where(eq(purchases.id, id));
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markPurchaseAsPaid(id: string) {
  if (USE_MOCK) {
    const purchase = mockGetPurchases().find((item) => item.id === id);
    const auth = await authorizeAction(getPurchasePermission(purchase?.category ?? "PROVEEDOR", "update"));
    if ("error" in auth) {
      return auth;
    }

    mockMarkPurchaseAsPaid(id);
  } else {
    const existingPurchase = await getExistingPurchase(id);
    if (!existingPurchase) {
      return { error: { _form: ["Compra no encontrada"] } };
    }

    const auth = await authorizeAction(getPurchasePermission(existingPurchase.category, "update"));
    if ("error" in auth) {
      return auth;
    }

    await getDb().update(purchases).set({ status: "PAID" }).where(eq(purchases.id, id));
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function revertPurchasePayment(id: string) {
  if (USE_MOCK) {
    const purchase = mockGetPurchases().find((item) => item.id === id);
    if (!purchase) {
      return { error: { _form: ["Compra no encontrada"] } };
    }

    const auth = await authorizeAction(getPurchasePermission(purchase.category, "update"));
    if ("error" in auth) {
      return auth;
    }

    if (purchase.status !== "PAID") {
      return { error: { _form: ["Solo se pueden revertir compras pagadas"] } };
    }

    mockRevertPurchasePayment(id);
  } else {
    const existingPurchase = await getExistingPurchase(id);
    if (!existingPurchase) {
      return { error: { _form: ["Compra no encontrada"] } };
    }

    const auth = await authorizeAction(getPurchasePermission(existingPurchase.category, "update"));
    if ("error" in auth) {
      return auth;
    }

    if (existingPurchase.status !== "PAID") {
      return { error: { _form: ["Solo se pueden revertir compras pagadas"] } };
    }

    await getDb().update(purchases).set({ status: "PENDING" }).where(eq(purchases.id, id));
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}
