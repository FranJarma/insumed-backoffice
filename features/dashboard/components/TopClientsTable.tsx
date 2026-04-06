import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface TopClient {
  name: string;
  total: number;
}

interface TopClientsTableProps {
  clients: TopClient[];
}

export function TopClientsTable({ clients }: TopClientsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 5 Clientes con Mayor Deuda</CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay cuentas pendientes.
          </p>
        ) : (
          <div className="space-y-3">
            {clients.map((client, index) => (
              <div
                key={client.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{client.name}</span>
                </div>
                <span className="font-mono text-sm font-semibold text-yellow-700">
                  {formatCurrency(client.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
