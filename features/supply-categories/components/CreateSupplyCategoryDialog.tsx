"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createSupplyCategory } from "../actions";
import { SupplyCategoryForm } from "./SupplyCategoryForm";
import type { CreateSupplyCategoryInput } from "../types";

export function CreateSupplyCategoryDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: CreateSupplyCategoryInput) => {
    const result = await createSupplyCategory(data);
    if ("success" in result) {
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4" />
          Nueva Categoría
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Categoría</DialogTitle>
        </DialogHeader>
        <SupplyCategoryForm
          onSubmit={onSubmit}
          onCancel={() => setOpen(false)}
          submitLabel="Guardar Categoría"
        />
      </DialogContent>
    </Dialog>
  );
}
