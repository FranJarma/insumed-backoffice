import { z } from "zod";

export const createCheckSchema = z.object({
  type: z.enum(["EMITIDO", "RECIBIDO"], { required_error: "El tipo es requerido" }),
  number: z.string().min(1, "El número de cheque es requerido"),
  bank: z.string().min(1, "El banco es requerido"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "El monto debe ser mayor a 0"),
  issueDate: z.string().min(1, "La fecha de emisión es requerida"),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  relatedEntity: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export type CreateCheckInput = z.infer<typeof createCheckSchema>;

export type CheckStatus = "PENDIENTE" | "DEPOSITADO" | "COBRADO" | "RECHAZADO";

export type UpdateCheckStatusInput = {
  status: "DEPOSITADO" | "COBRADO" | "RECHAZADO";
};
