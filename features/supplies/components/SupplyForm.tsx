"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createSupplySchema, SUPPLY_CATEGORIES, type CreateSupplyInput } from "../types";

interface SupplyFormProps {
  defaultValues?: Partial<CreateSupplyInput>;
  onSubmit: (data: CreateSupplyInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function SupplyForm({ defaultValues, onSubmit, onCancel, submitLabel }: SupplyFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSupplyInput>({
    resolver: zodResolver(createSupplySchema),
    values: defaultValues as CreateSupplyInput | undefined,
  });

  const unitPrice = watch("unitPrice");

  useEffect(() => {
    const price = parseFloat(unitPrice);
    if (!isNaN(price) && price >= 0) {
      setValue("priceWithVat", (price * 1.21).toFixed(2));
    }
  }, [unitPrice, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* PM + Nombre */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pm">
            PM <span className="text-destructive">*</span>
          </Label>
          <Input id="pm" {...register("pm")} placeholder="PM-0001" />
          {errors.pm && <p className="text-xs text-destructive">{errors.pm.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input id="name" {...register("name")} placeholder="Catéter Venoso Central" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Descripción <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Input id="description" {...register("description")} placeholder="Triple lumen 7Fr x 20cm" />
      </div>

      {/* Precio Unitario + Precio con IVA */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="unitPrice">
            Precio Unitario ($) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min="0"
            {...register("unitPrice")}
            placeholder="12500.00"
          />
          {errors.unitPrice && (
            <p className="text-xs text-destructive">{errors.unitPrice.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priceWithVat">
            Precio con IVA ($) <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input
            id="priceWithVat"
            type="number"
            step="0.01"
            min="0"
            {...register("priceWithVat")}
            placeholder="15125.00"
          />
          {errors.priceWithVat && (
            <p className="text-xs text-destructive">{errors.priceWithVat.message}</p>
          )}
        </div>
      </div>

      {/* Categoría + Nº Lote */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">
            Categoría <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <select
            id="category"
            {...register("category")}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar...</option>
            {SUPPLY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lotNumber">
            Nº de Lote <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input id="lotNumber" {...register("lotNumber")} placeholder="L2024-001" />
        </div>
      </div>

      {/* Fecha de Vencimiento */}
      <div className="space-y-1.5">
        <Label htmlFor="expiryDate">
          Fecha de Vencimiento <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Input id="expiryDate" type="date" {...register("expiryDate")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
