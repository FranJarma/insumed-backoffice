"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSupplyCategory } from "../actions";
import { SupplyCategoryForm } from "./SupplyCategoryForm";
import type { SupplyCategory } from "@/db/schema";
import type { CreateSupplyCategoryInput } from "../types";

interface EditSupplyCategoryDialogProps {
  category: SupplyCategory | null;
  onOpenChange: (open: boolean) => void;
}

export function EditSupplyCategoryDialog({ category, onOpenChange }: EditSupplyCategoryDialogProps) {
  const router = useRouter();

  const onSubmit = async (data: CreateSupplyCategoryInput) => {
    if (!category) return;
    const result = await updateSupplyCategory(category.id, data);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!category} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Categoría</DialogTitle>
        </DialogHeader>
        <SupplyCategoryForm
          defaultValues={category ? { name: category.name } : undefined}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Guardar Cambios"
        />
      </DialogContent>
    </Dialog>
  );
}
