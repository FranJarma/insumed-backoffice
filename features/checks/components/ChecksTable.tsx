"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageIcon, Pencil, Trash2, CircleCheck, RotateCcw } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EditCheckDialog } from "./EditCheckDialog";
import { updateCheckStatus, deleteCheck } from "../actions";
import { formatCurrency, formatDate, monthLabel, prevMonth, nextMonth } from "@/lib/utils";
import type { MockBank, MockCheck } from "@/db/mock-store";

interface ChecksTableProps {
  checks: MockCheck[];
  banks: MockBank[];
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
function currentYear() { return new Date().getFullYear(); }
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear() - 2 + i);

export function ChecksTable({ checks, banks }: ChecksTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editCheck, setEditCheck] = useState<MockCheck | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RECIBIDO" | "EMITIDO">("ALL");

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
    () => filtered.filter((c) => c.type === "RECIBIDO" && c.status !== "RECHAZADO").reduce((sum, c) => sum + parseFloat(c.amount), 0),
    [filtered]
  );
  const totalEmitidos = useMemo(
    () => filtered.filter((c) => c.type === "EMITIDO" && c.status !== "RECHAZADO").reduce((sum, c) => sum + parseFloat(c.amount), 0),
    [filtered]
  );

  const handleStatus = (id: string, status: MockCheck["status"]) => {
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
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedYear}
          onChange={(e) => {
            const y = parseInt(e.target.value);
            setSelectedYear(y);
            setSelectedMonth(`${y}-${selectedMonth.slice(5)}`);
          }}
          className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <div className="flex items-center gap-1 rounded-md border bg-card px-1 py-1.5">
          <button onClick={() => handleMonthNav("prev")} className="rounded px-1 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">{monthLabel(effectiveMonth)}</span>
          <button onClick={() => handleMonthNav("next")} className="rounded px-1 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

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
          {/* Resumen */}
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
                  <TableHead>N° Op.</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>F. Est. Cobro/Pago</TableHead>
                  <TableHead>F. Cobro/Pago real</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10 text-center">Foto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          check.type === "RECIBIDO" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {check.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{check.kind === "COMUN" ? "Común" : "Diferido"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{check.number}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {check.operationNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{check.bank}</TableCell>
                    <TableCell className="text-muted-foreground">{check.relatedEntity ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(check.dueDate)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {check.estimatedPaymentDate ? (
                        <span className="text-blue-700 font-medium">{formatDate(check.estimatedPaymentDate)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {check.paymentDate ? (
                        <span className="text-green-700 font-medium">{formatDate(check.paymentDate)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(check.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[check.status]}>
                        {STATUS_LABEL[check.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {check.photoUrl ? (
                        <a href={check.photoUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded p-1 text-blue-600 hover:bg-blue-50">
                          <ImageIcon className="h-4 w-4" />
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {check.status === "PENDIENTE" && (
                          <Tooltip label={check.type === "RECIBIDO" ? "Marcar cobrado" : "Marcar pagado"}>
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-green-700 hover:text-green-700"
                              onClick={() => handleStatus(check.id, "COBRADO")} disabled={isPending}>
                              <CircleCheck className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        )}
                        {check.status === "COBRADO" && (
                          <Tooltip label="Marcar pendiente">
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStatus(check.id, "PENDIENTE")} disabled={isPending}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip label="Editar">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => setEditCheck(check)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Tooltip>
                        <Tooltip label="Eliminar">
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(check.id)}>
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
        </>
      )}

      <EditCheckDialog
        check={editCheck}
        banks={banks}
        onOpenChange={(o) => !o && setEditCheck(null)}
      />
      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteCheck(deleteId);
            router.refresh();
          }
        }}
      />
    </div>
  );
}
