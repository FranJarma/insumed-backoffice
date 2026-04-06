"use server";

import { revalidatePath } from "next/cache";
import { mockGetClients, mockCreateClient } from "@/db/mock-store";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { createClientSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getClients() {
  if (USE_MOCK) return mockGetClients();
  return getDb().select().from(clients).orderBy(clients.name);
}

export async function createClient(input: unknown) {
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

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
