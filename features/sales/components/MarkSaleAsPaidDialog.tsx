"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleDollarSign } from "lucide-react";
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
import { markSaleAsPaid } from "../actions";
import { markSaleAsPaidSchema, type MarkSaleAsPaidInput } from "../types";

interface MarkSaleAsPaidDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MarkSaleAsPaidDialog({
  saleId,
  open,
  onOpenChange,
  onSuccess,
}: MarkSaleAsPaidDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MarkSaleAsPaidInput>({
    resolver: zodResolver(markSaleAsPaidSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
    },
    mode: "onChange",
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset({ paymentDate: new Date().toISOString().split("T")[0] });
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: MarkSaleAsPaidInput) => {
    if (!saleId) return;
    const result = await markSaleAsPaid(saleId, data);
    if ("success" in result) {
      reset({ paymentDate: new Date().toISOString().split("T")[0] });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-green-700" />
            Marcar como Pagada
          </DialogTitle>
          <DialogDescription>
            Registrá la fecha en la que se recibió el pago de la venta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="paymentDate">Fecha de pago <span className="text-destructive">*</span></Label>
            <Input id="paymentDate" type="date" {...register("paymentDate")} />
            {errors.paymentDate && (
              <p className="text-xs text-destructive">{errors.paymentDate.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? "Guardando..." : "Marcar como Pagada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
