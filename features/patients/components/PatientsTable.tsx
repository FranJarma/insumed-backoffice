"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EditPatientDialog } from "./EditPatientDialog";
import { deletePatient } from "../actions";
import { formatDate } from "@/lib/utils";
type ClientOption = { id: string; name: string };

type PatientRow = {
  id: string;
  name: string;
  clientId: string;
  clientName: string | null;
  createdAt: Date | string;
};

interface PatientsTableProps {
  patients: PatientRow[];
  clients: ClientOption[];
}

export function PatientsTable({ patients, clients }: PatientsTableProps) {
  const router = useRouter();
  const [editPatient, setEditPatient] = useState<PatientRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (patients.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay pacientes registrados.
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
              <TableHead>Cliente / Obra Social</TableHead>
              <TableHead>Fecha de Alta</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {patient.clientName ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(
                    typeof patient.createdAt === "string"
                      ? patient.createdAt
                      : patient.createdAt.toISOString().split("T")[0]
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditPatient(patient)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(patient.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditPatientDialog
        patient={editPatient}
        clients={clients}
        onOpenChange={(o) => !o && setEditPatient(null)}
      />

      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deletePatient(deleteId);
            router.refresh();
          }
        }}
      />
    </>
  );
}
