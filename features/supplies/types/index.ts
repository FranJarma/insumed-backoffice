import { z } from "zod";

export const SUPPLY_CATEGORIES = [
  "Descartables",
  "Curaciones",
  "Farmacia",
  "Instrumental",
  "Equipamiento",
  "Varios",
] as const;

export const createSupplySchema = z.object({
  pm: z.string().min(1, "El PM es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  unitPrice: z
    .string()
    .min(1, "El precio unitario es requerido")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Precio inválido"),
  priceWithVat: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), "Precio con IVA inválido"),
  category: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
