"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSupply } from "../actions";
import { SupplyForm } from "./SupplyForm";
import type { MockSupply } from "@/db/mock-store";
import type { CreateSupplyInput } from "../types";

interface EditSupplyDialogProps {
  supply: MockSupply | null;
  onOpenChange: (open: boolean) => void;
}

export function EditSupplyDialog({ supply, onOpenChange }: EditSupplyDialogProps) {
  const router = useRouter();

  const onSubmit = async (data: CreateSupplyInput) => {
    if (!supply) return;
    const result = await updateSupply(supply.id, data);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!supply} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Insumo</DialogTitle>
        </DialogHeader>
        <SupplyForm
          defaultValues={
            supply
              ? {
                  pm: supply.pm,
                  name: supply.name,
                  description: supply.description ?? "",
                  unitPrice: supply.unitPrice,
                  unitMeasure: supply.unitMeasure,
                  expiryDate: supply.expiryDate ?? "",
                }
              : undefined
          }
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Guardar Cambios"
        />
      </DialogContent>
    </Dialog>
  );
}
