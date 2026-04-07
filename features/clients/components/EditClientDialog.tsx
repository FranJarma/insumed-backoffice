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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClient } from "../actions";
import { createClientSchema, type CreateClientInput } from "../types";
import type { Client } from "@/db/schema";

interface EditClientDialogProps {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ client, onOpenChange }: EditClientDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    values: client ? { name: client.name, cuit: client.cuit } : undefined,
  });

  const onSubmit = async (data: CreateClientInput) => {
    if (!client) return;
    const result = await updateClient(client.id, data);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nombre / Razón Social <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cuit">
              CUIT <span className="text-destructive">*</span>
            </Label>
            <Input id="cuit" {...register("cuit")} />
            {errors.cuit && (
              <p className="text-xs text-destructive">{errors.cuit.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
