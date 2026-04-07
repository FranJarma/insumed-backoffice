"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { mockGetPatients, mockGetPatientsWithClient, mockCreatePatient, mockUpdatePatient, mockSoftDeletePatient } from "@/db/mock-store";
import { getDb } from "@/db";
import { patients, clients } from "@/db/schema";
import { createPatientSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getPatients() {
  if (USE_MOCK) return mockGetPatients();
  return getDb().select().from(patients).where(isNull(patients.deletedAt)).orderBy(patients.name);
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
    .where(isNull(patients.deletedAt))
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

export async function updatePatient(id: string, input: unknown) {
  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockUpdatePatient(id, parsed.data);
  } else {
    await getDb().update(patients).set(parsed.data).where(eq(patients.id, id));
  }

  revalidatePath("/patients");
  return { success: true };
}

export async function deletePatient(id: string) {
  if (USE_MOCK) {
    mockSoftDeletePatient(id);
  } else {
    await getDb().update(patients).set({ deletedAt: new Date() }).where(eq(patients.id, id));
  }

  revalidatePath("/patients");
  return { success: true };
}
