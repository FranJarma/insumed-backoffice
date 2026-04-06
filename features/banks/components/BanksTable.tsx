import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { MockBank } from "@/db/mock-store";

interface BanksTableProps {
  banks: MockBank[];
}

export function BanksTable({ banks }: BanksTableProps) {
  if (banks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay bancos registrados.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre del Banco</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banks.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
