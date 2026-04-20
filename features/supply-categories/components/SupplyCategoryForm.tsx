"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createSupplyCategorySchema, type CreateSupplyCategoryInput } from "../types";

interface SupplyCategoryFormProps {
  defaultValues?: Partial<CreateSupplyCategoryInput>;
  onSubmit: (data: CreateSupplyCategoryInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function SupplyCategoryForm({ defaultValues, onSubmit, onCancel, submitLabel }: SupplyCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateSupplyCategoryInput>({
    resolver: zodResolver(createSupplyCategorySchema),
    values: defaultValues as CreateSupplyCategoryInput | undefined,
    mode: "onChange",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input id="name" {...register("name")} placeholder="Curaciones" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
