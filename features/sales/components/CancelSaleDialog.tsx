"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelSale } from "../actions";
import { cancelSaleSchema, type CancelSaleInput } from "../types";

interface CancelSaleDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CancelSaleDialog({
  saleId,
  open,
  onOpenChange,
  onSuccess,
}: CancelSaleDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CancelSaleInput>({
    resolver: zodResolver(cancelSaleSchema),
  });

  const onSubmit = async (data: CancelSaleInput) => {
    if (!saleId) return;
    const result = await cancelSale(saleId, data);
    if ("success" in result) {
      reset();
      onSuccess();
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Anular Factura
          </DialogTitle>
          <DialogDescription>
            Esta acción anulará la factura. Se requiere el número y URL de la nota
            de crédito correspondiente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="creditNoteNumber">Número de Nota de Crédito</Label>
            <Input
              id="creditNoteNumber"
              {...register("creditNoteNumber")}
              placeholder="NC-A-00001"
            />
            {errors.creditNoteNumber && (
              <p className="text-xs text-destructive">
                {errors.creditNoteNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="creditNoteUrl">URL de la Nota de Crédito</Label>
            <Input
              id="creditNoteUrl"
              {...register("creditNoteUrl")}
              placeholder="https://drive.google.com/..."
              type="url"
            />
            {errors.creditNoteUrl && (
              <p className="text-xs text-destructive">
                {errors.creditNoteUrl.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Anulando..." : "Confirmar Anulación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
