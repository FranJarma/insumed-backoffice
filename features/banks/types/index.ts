import { z } from "zod";

export const createBankSchema = z.object({
  name: z.string().min(1, "El nombre del banco es requerido"),
});

export type CreateBankInput = z.infer<typeof createBankSchema>;
