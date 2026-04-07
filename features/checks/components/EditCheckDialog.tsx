"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCheck } from "../actions";
import { createCheckSchema, type CreateCheckInput } from "../types";
import type { MockBank, MockCheck } from "@/db/mock-store";

interface EditCheckDialogProps {
  check: MockCheck | null;
  banks: MockBank[];
  onOpenChange: (open: boolean) => void;
}

export function EditCheckDialog({ check, banks, onOpenChange }: EditCheckDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCheckInput>({
    resolver: zodResolver(createCheckSchema),
    values: check
      ? {
          type: check.type,
          number: check.number,
          bank: check.bank,
          amount: check.amount,
          issueDate: check.issueDate,
          dueDate: check.dueDate,
          relatedEntity: check.relatedEntity ?? "",
          notes: check.notes ?? "",
        }
      : undefined,
  });

  const selectedBank = watch("bank");

  const onSubmit = async (data: CreateCheckInput) => {
    if (!check) return;
    const result = await updateCheck(check.id, data);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!check} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Cheque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <select
                {...register("type")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="RECIBIDO">Recibido (de cliente)</option>
                <option value="EMITIDO">Emitido (a proveedor)</option>
              </select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-number">
                Nº Cheque <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-number" {...register("number")} />
              {errors.number && (
                <p className="text-xs text-destructive">{errors.number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Banco <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedBank}
                onValueChange={(v) => setValue("bank", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar banco..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank && (
                <p className="text-xs text-destructive">{errors.bank.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">
                Monto ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-issueDate">
                Fecha de Emisión <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-issueDate" type="date" {...register("issueDate")} />
              {errors.issueDate && (
                <p className="text-xs text-destructive">{errors.issueDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dueDate">
                Fecha de Vencimiento <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-xs text-destructive">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-relatedEntity">Entidad (cliente / proveedor)</Label>
            <Input id="edit-relatedEntity" {...register("relatedEntity")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notas</Label>
            <Input id="edit-notes" {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
