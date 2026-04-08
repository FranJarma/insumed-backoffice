import { z } from "zod";

export const UNIT_MEASURES = [
  "unidad",
  "caja",
  "paquete",
  "frasco",
  "ampolla",
  "sobre",
  "rollo",
  "par",
  "kit",
] as const;

export const createSupplySchema = z.object({
  pm: z.string().min(1, "El PM es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  unitPrice: z
    .string()
    .min(1, "El precio es requerido")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Precio inválido"),
  unitMeasure: z.string().min(1, "La unidad de medida es requerida"),
  expiryDate: z.string().optional(),
});

export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
