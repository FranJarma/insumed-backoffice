import { z } from "zod";

export const createPatientSchema = z.object({
  name: z.string().min(1, "El nombre del paciente es requerido"),
  clientId: z.string().min(1, "Seleccione un cliente válido"),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
