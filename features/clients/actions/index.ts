"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { mockGetClients, mockCreateClient, mockUpdateClient, mockSoftDeleteClient } from "@/db/mock-store";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { createClientSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getClients() {
  await requirePermission("clients:read");
  if (USE_MOCK) return mockGetClients();
  return getDb().select().from(clients).where(isNull(clients.deletedAt)).orderBy(clients.name);
}

export async function createClient(input: unknown) {
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("clients:create");
  if ("error" in auth) return auth;

  let clientId: string;

  if (USE_MOCK) {
    const newClient = mockCreateClient(parsed.data);
    clientId = newClient.id;
  } else {
    const [newClient] = await getDb()
      .insert(clients)
      .values(parsed.data)
      .returning({ id: clients.id });
    clientId = newClient.id;
  }

  revalidatePath("/clients");
  return { success: true, clientId };
}

export async function updateClient(id: string, input: unknown) {
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("clients:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockUpdateClient(id, parsed.data);
  } else {
    await getDb().update(clients).set(parsed.data).where(eq(clients.id, id));
  }

  revalidatePath("/clients");
  return { success: true };
}

export async function deleteClient(id: string) {
  const auth = await authorizeAction("clients:delete");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockSoftDeleteClient(id);
  } else {
    await getDb().update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));
  }

  revalidatePath("/clients");
  return { success: true };
}
