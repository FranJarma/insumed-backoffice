import { z } from "zod";

export const createProviderSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  cuit: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
