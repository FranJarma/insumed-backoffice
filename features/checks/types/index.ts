import { z } from "zod";
import { optionalUploadKeySchema } from "@/lib/upload-validation";

export const createCheckSchema = z.object({
  type: z.enum(["EMITIDO", "RECIBIDO"], { required_error: "El tipo es requerido" }),
  kind: z.enum(["COMUN", "DIFERIDO"]).default("COMUN"),
  number: z.string().min(1, "El número de cheque es requerido"),
  operationNumber: z.string().optional(),
  bank: z.string().min(1, "El banco es requerido"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((value) => !Number.isNaN(parseFloat(value)) && parseFloat(value) > 0, "El monto debe ser mayor a 0"),
  issueDate: z.string().min(1, "La fecha de emision es requerida"),
  estimatedPaymentDate: z.string().optional(),
  relatedEntity: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: optionalUploadKeySchema("cheques", "Cheque"),
});

export type CreateCheckInput = z.infer<typeof createCheckSchema>;

export type CheckStatus = "PENDIENTE" | "DEPOSITADO" | "COBRADO" | "PAGADO" | "RECHAZADO";
