import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { MockProvider } from "@/db/mock-store";

interface ProvidersTableProps {
  providers: MockProvider[];
}

export function ProvidersTable({ providers }: ProvidersTableProps) {
  if (providers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay proveedores registrados.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre / Razón Social</TableHead>
            <TableHead>CUIT</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Dirección</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
