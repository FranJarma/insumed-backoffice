import { z } from "zod";

export const createSupplyCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
});

export type CreateSupplyCategoryInput = z.infer<typeof createSupplyCategorySchema>;
