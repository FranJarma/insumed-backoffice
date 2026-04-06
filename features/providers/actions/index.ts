"use server";

import { revalidatePath } from "next/cache";
import { mockGetProviders, mockCreateProvider } from "@/db/mock-store";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { createProviderSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getProviders() {
  if (USE_MOCK) return mockGetProviders();
  return getDb().select().from(providers).orderBy(providers.name);
}

export async function createProvider(input: unknown) {
  const parsed = createProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

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
