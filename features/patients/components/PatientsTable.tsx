import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type PatientRow = {
  id: string;
  name: string;
  clientId: string;
  clientName: string | null;
  createdAt: Date | string;
};

interface PatientsTableProps {
  patients: PatientRow[];
}

export function PatientsTable({ patients }: PatientsTableProps) {
  if (patients.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay pacientes registrados.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Cliente / Obra Social</TableHead>
            <TableHead>Fecha de Alta</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
