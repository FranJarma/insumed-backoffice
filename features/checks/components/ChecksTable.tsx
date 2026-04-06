"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateCheckStatus } from "../actions";
import { formatCurrency, formatDate, monthLabel, prevMonth, nextMonth } from "@/lib/utils";
import type { MockCheck } from "@/db/mock-store";

interface ChecksTableProps {
  checks: MockCheck[];
}

const STATUS_LABEL: Record<MockCheck["status"], string> = {
  PENDIENTE: "Pendiente",
  DEPOSITADO: "Depositado",
  COBRADO: "Cobrado",
  RECHAZADO: "Rechazado",
};
const STATUS_VARIANT: Record<MockCheck["status"], "pending" | "paid" | "cancelled" | "deposited"> = {
  PENDIENTE: "pending",
  DEPOSITADO: "deposited",
  COBRADO: "paid",
  RECHAZADO: "cancelled",
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentYear() {
  return new Date().getFullYear();
}

const YEARS = Array.from({ length: 5 }, (_, i) => currentYear() - 2 + i);

export function ChecksTable({ checks }: ChecksTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RECIBIDO" | "EMITIDO">("ALL");

  // Keep month in sync with selected year
  const effectiveMonth = `${selectedYear}-${selectedMonth.slice(5)}`;

  const filtered = useMemo(
    () =>
      checks.filter((c) => {
        const matchMonth = c.dueDate.startsWith(effectiveMonth);
        const matchType = typeFilter === "ALL" || c.type === typeFilter;
        return matchMonth && matchType;
      }),
    [checks, effectiveMonth, typeFilter]
  );

  const totalRecibidos = useMemo(
    () =>
      filtered
        .filter((c) => c.type === "RECIBIDO" && c.status !== "RECHAZADO")
        .reduce((sum, c) => sum + parseFloat(c.amount), 0),
    [filtered]
  );
  const totalEmitidos = useMemo(
    () =>
      filtered
        .filter((c) => c.type === "EMITIDO" && c.status !== "RECHAZADO")
        .reduce((sum, c) => sum + parseFloat(c.amount), 0),
    [filtered]
  );

  const handleStatus = (id: string, status: "DEPOSITADO" | "COBRADO" | "RECHAZADO") => {
    startTransition(async () => {
      await updateCheckStatus(id, status);
      router.refresh();
    });
  };

  const handleMonthNav = (direction: "prev" | "next") => {
    const newMonth = direction === "prev" ? prevMonth(effectiveMonth) : nextMonth(effectiveMonth);
    setSelectedMonth(newMonth);
    setSelectedYear(parseInt(newMonth.slice(0, 4)));
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Año */}
        <select
          value={selectedYear}
          onChange={(e) => {
            const y = parseInt(e.target.value);
            setSelectedYear(y);
            setSelectedMonth(`${y}-${selectedMonth.slice(5)}`);
          }}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Mes */}
        <div className="flex items-center gap-1 rounded-md border bg-card px-1 py-1.5">
          <button onClick={() => handleMonthNav("prev")} className="rounded px-1 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {monthLabel(effectiveMonth)}
          </span>
          <button onClick={() => handleMonthNav("next")} className="rounded px-1 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Tipo */}
        <div className="flex rounded-md border bg-card">
          {(["ALL", "RECIBIDO", "EMITIDO"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "ALL" ? "Todos" : t === "RECIBIDO" ? "Recibidos" : "Emitidos"}
            </button>
          ))}
        </div>

      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No hay cheques para el período seleccionado.
        </div>
      ) : (
        <>
          {/* Resumen de totales */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-6">
              {typeFilter !== "EMITIDO" && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total Recibidos</span>
                  <span className="text-sm font-semibold text-green-700">{formatCurrency(totalRecibidos)}</span>
                </div>
              )}
              {typeFilter !== "RECIBIDO" && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total Emitidos</span>
                  <span className="text-sm font-semibold text-red-700">{formatCurrency(totalEmitidos)}</span>
                </div>
              )}
            </div>
            {typeFilter === "ALL" && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Balance neto</span>
                <span className="text-base font-bold">{formatCurrency(totalRecibidos - totalEmitidos)}</span>
              </div>
            )}
          </div>
          <div className="rounded-md border bg-card">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nº Cheque</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>F. Pago/Cobro</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12 text-center">Foto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      check.type === "RECIBIDO"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {check.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{check.number}</TableCell>
                  <TableCell className="text-muted-foreground">{check.bank}</TableCell>
                  <TableCell className="text-muted-foreground">{check.relatedEntity ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(check.issueDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(check.dueDate)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {check.paymentDate ? (
                      <span className="text-green-700 font-medium">{formatDate(check.paymentDate)}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(check.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[check.status]}>
                      {STATUS_LABEL[check.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {check.photoUrl ? (
                      <a
                        href={check.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="Ver foto del cheque"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {check.status === "PENDIENTE" && check.type === "RECIBIDO" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-blue-700 hover:text-blue-700"
                          onClick={() => handleStatus(check.id, "DEPOSITADO")} disabled={isPending}>
                          Depositado
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleStatus(check.id, "RECHAZADO")} disabled={isPending}>
                          Rechazado
                        </Button>
                      </div>
                    )}
                    {check.status === "DEPOSITADO" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-green-700 hover:text-green-700"
                          onClick={() => handleStatus(check.id, "COBRADO")} disabled={isPending}>
                          Cobrado
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleStatus(check.id, "RECHAZADO")} disabled={isPending}>
                          Rechazado
                        </Button>
                      </div>
                    )}
                    {check.status === "PENDIENTE" && check.type === "EMITIDO" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-green-700 hover:text-green-700"
                          onClick={() => handleStatus(check.id, "COBRADO")} disabled={isPending}>
                          Cobrado
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleStatus(check.id, "RECHAZADO")} disabled={isPending}>
                          Rechazado
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
