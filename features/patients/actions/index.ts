"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { mockGetPatients, mockGetPatientsWithClient, mockCreatePatient } from "@/db/mock-store";
import { getDb } from "@/db";
import { patients, clients } from "@/db/schema";
import { createPatientSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getPatients() {
  if (USE_MOCK) return mockGetPatients();
  return getDb().select().from(patients).orderBy(patients.name);
}

export async function getPatientsWithClient() {
  if (USE_MOCK) return mockGetPatientsWithClient();
  return getDb()
    .select({
      id: patients.id,
      name: patients.name,
      clientId: patients.clientId,
      clientName: clients.name,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .leftJoin(clients, eq(patients.clientId, clients.id))
    .orderBy(patients.name);
}

export async function createPatient(input: unknown) {
  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockCreatePatient(parsed.data);
  } else {
    await getDb().insert(patients).values(parsed.data);
  }

  revalidatePath("/patients");
  return { success: true };
}
