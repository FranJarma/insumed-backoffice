import { z } from "zod";

export const SUPPLY_CATEGORIES = [
  "Descartables",
  "Curaciones",
  "Farmacia",
  "Instrumental",
  "Equipamiento",
  "Varios",
] as const;

export const SUPPLY_STATUS_LABELS: Record<string, string> = {
  en_deposito: "En depósito",
  en_entrega: "En entrega",
  entregado: "Entregado",
};

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
  stock: z
    .string()
    .min(1, "El stock es requerido")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, "Stock inválido"),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
