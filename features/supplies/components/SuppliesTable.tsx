"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EditSupplyDialog } from "./EditSupplyDialog";
import { deleteSupply } from "../actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { MockSupply } from "@/db/mock-store";

interface SuppliesTableProps {
  supplies: MockSupply[];
}

export function SuppliesTable({ supplies }: SuppliesTableProps) {
  const router = useRouter();
  const [editSupply, setEditSupply] = useState<MockSupply | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (supplies.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay insumos registrados.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">PM</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm font-medium">{s.pm}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.description ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(s.unitPrice)}</TableCell>
                <TableCell className="text-muted-foreground">{s.unitMeasure}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.expiryDate ? formatDate(s.expiryDate) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip label="Editar">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditSupply(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Eliminar">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditSupplyDialog
        supply={editSupply}
        onOpenChange={(o) => !o && setEditSupply(null)}
      />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteSupply(deleteId);
            router.refresh();
          }
        }}
      />
    </>
  );
}
