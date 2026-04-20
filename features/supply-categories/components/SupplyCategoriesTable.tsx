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
import { EditSupplyCategoryDialog } from "./EditSupplyCategoryDialog";
import { deleteSupplyCategory } from "../actions";
import type { SupplyCategory } from "@/db/schema";

interface SupplyCategoriesTableProps {
  categories: SupplyCategory[];
}

export function SupplyCategoriesTable({ categories }: SupplyCategoriesTableProps) {
  const router = useRouter();
  const [editCategory, setEditCategory] = useState<SupplyCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay categorías registradas.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip label="Editar">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditCategory(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Eliminar">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(c.id)}
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

      <EditSupplyCategoryDialog
        category={editCategory}
        onOpenChange={(o) => !o && setEditCategory(null)}
      />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteSupplyCategory(deleteId);
            router.refresh();
          }
        }}
      />
    </>
  );
}
