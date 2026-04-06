import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  cuit: z.string().min(1, "El CUIT es requerido"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
