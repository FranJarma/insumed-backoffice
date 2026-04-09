"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { mockGetProviders, mockCreateProvider, mockUpdateProvider, mockSoftDeleteProvider } from "@/db/mock-store";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { createProviderSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getProviders() {
  await requirePermission("providers:read");
  if (USE_MOCK) return mockGetProviders();
  return getDb().select().from(providers).where(isNull(providers.deletedAt)).orderBy(providers.name);
}

export async function createProvider(input: unknown) {
  const parsed = createProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("providers:create");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockCreateProvider(parsed.data);
  } else {
    await getDb().insert(providers).values({
      name: parsed.data.name,
      cuit: parsed.data.cuit || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    });
  }

  revalidatePath("/providers");
  return { success: true };
}

export async function updateProvider(id: string, input: unknown) {
  const parsed = createProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("providers:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockUpdateProvider(id, parsed.data);
  } else {
    await getDb().update(providers).set({
      name: parsed.data.name,
      cuit: parsed.data.cuit || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    }).where(eq(providers.id, id));
  }

  revalidatePath("/providers");
  return { success: true };
}

export async function deleteProvider(id: string) {
  const auth = await authorizeAction("providers:delete");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockSoftDeleteProvider(id);
  } else {
    await getDb().update(providers).set({ deletedAt: new Date() }).where(eq(providers.id, id));
  }

  revalidatePath("/providers");
  return { success: true };
}
