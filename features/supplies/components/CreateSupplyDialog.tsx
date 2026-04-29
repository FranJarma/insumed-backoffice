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
import { createSupply } from "../actions";
import { SupplyForm } from "./SupplyForm";
import type { CreateSupplyInput } from "../types";

type CategoryOption = { id: string; name: string };

interface CreateSupplyDialogProps {
  categories: CategoryOption[];
}

export function CreateSupplyDialog({ categories }: CreateSupplyDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: CreateSupplyInput) => {
    const result = await createSupply(data);
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
          Nuevo Insumo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Insumo</DialogTitle>
        </DialogHeader>
        <SupplyForm
          categories={categories}
          onSubmit={onSubmit}
          onCancel={() => setOpen(false)}
          submitLabel="Guardar Insumo"
        />
      </DialogContent>
    </Dialog>
  );
}
