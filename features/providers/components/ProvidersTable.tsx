"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EditProviderDialog } from "./EditProviderDialog";
import { deleteProvider } from "../actions";
import type { MockProvider } from "@/db/mock-store";

interface ProvidersTableProps {
  providers: MockProvider[];
}

export function ProvidersTable({ providers }: ProvidersTableProps) {
  const router = useRouter();
  const [editProvider, setEditProvider] = useState<MockProvider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (providers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay proveedores registrados.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre / Razón Social</TableHead>
              <TableHead>CUIT</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{p.cuit ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.address ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip label="Editar">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditProvider(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Eliminar">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
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

      <EditProviderDialog provider={editProvider} onOpenChange={(o) => !o && setEditProvider(null)} />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteProvider(deleteId);
            router.refresh();
          }
        }}
      />
    </>
  );
}
