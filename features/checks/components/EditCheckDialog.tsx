"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCheck } from "../actions";
import { createCheckSchema, type CreateCheckInput } from "../types";
import type { MockBank, MockCheck } from "@/db/mock-store";
import { EntityAutocomplete } from "./EntityAutocomplete";

type EntityOption = { id: string; name: string };

interface EditCheckDialogProps {
  check: MockCheck | null;
  banks: MockBank[];
  clients: EntityOption[];
  providers: EntityOption[];
  onOpenChange: (open: boolean) => void;
}

export function EditCheckDialog({ check, banks, clients, providers, onOpenChange }: EditCheckDialogProps) {
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
          kind: check.kind,
          number: check.number,
          operationNumber: check.operationNumber ?? "",
          bank: check.bank,
          amount: check.amount,
          issueDate: check.issueDate,
          estimatedPaymentDate: check.estimatedPaymentDate ?? "",
          relatedEntity: check.relatedEntity ?? "",
          notes: check.notes ?? "",
        }
      : undefined,
  });

  const selectedBank = watch("bank");
  const kind = watch("kind");
  const type = watch("type");
  const relatedEntity = watch("relatedEntity");

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
      <DialogContent className="flex flex-col sm:max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Editar Cheque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Tipo + Tipo de cheque */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <select
                  {...register("type")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="RECIBIDO">Recibido (de cliente)</option>
                  <option value="EMITIDO">Emitido (a proveedor)</option>
                </select>
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cheque <span className="text-destructive">*</span></Label>
                <div className="flex gap-1.5">
                  {(["COMUN", "DIFERIDO"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setValue("kind", k, { shouldValidate: true })}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        kind === k
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {k === "COMUN" ? "Común" : "Diferido"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Nº Cheque + N° Operación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-number">Nº Cheque <span className="text-destructive">*</span></Label>
                <Input id="edit-number" {...register("number")} />
                {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-operationNumber">N° Operación <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input id="edit-operationNumber" {...register("operationNumber")} placeholder="OP-2026-001" />
              </div>
            </div>

            {/* Banco + Monto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Banco <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedBank}
                  onValueChange={(v) => setValue("bank", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar banco..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bank && <p className="text-xs text-destructive">{errors.bank.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">Monto ($) <span className="text-destructive">*</span></Label>
                <Input id="edit-amount" type="number" step="0.01" min="0" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
            </div>

            {/* Fecha de Emisión */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-issueDate">Fecha de Emisión <span className="text-destructive">*</span></Label>
              <Input id="edit-issueDate" type="date" {...register("issueDate")} />
              {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate.message}</p>}
            </div>

            {/* Fecha est. de cobro/pago */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-estimatedPaymentDate">
                Fecha est. de cobro/pago <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="edit-estimatedPaymentDate" type="date" {...register("estimatedPaymentDate")} />
            </div>

            {/* Entidad + Notas */}
            <div className="space-y-1.5">
              <Label>
                {type === "EMITIDO" ? "Proveedor" : "Cliente"}
                <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <EntityAutocomplete
                entities={type === "EMITIDO" ? providers : clients}
                value={relatedEntity ?? ""}
                onChange={(v) => setValue("relatedEntity", v, { shouldValidate: true })}
                placeholder={type === "EMITIDO" ? "Buscar proveedor..." : "Buscar cliente..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input id="edit-notes" {...register("notes")} />
            </div>

          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
