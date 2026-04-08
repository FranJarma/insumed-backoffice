"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSale } from "../actions";
import { createSaleSchema, type CreateSaleInput, type SaleItemInput } from "../types";
import type { MockSupply } from "@/db/mock-store";
import { ClientAutocomplete } from "./ClientAutocomplete";
import { formatCurrency } from "@/lib/utils";

type ClientOption = { id: string; name: string; cuit: string };
type PatientOption = { id: string; name: string; clientId: string };

type SaleItem = {
  id: string;
  supplyId: string | null;
  pm: string;
  supplyName: string;
  unitMeasure: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
};

type SaleRow = {
  id: string;
  clientId: string;
  invoiceType: "A" | "B";
  invoiceNumber: string;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  items?: SaleItem[];
};

interface EditSaleDialogProps {
  sale: SaleRow | null;
  clients: ClientOption[];
  patients: PatientOption[];
  supplies: MockSupply[];
  onOpenChange: (open: boolean) => void;
}

type ItemDraft = {
  supplyId: string;
  pm: string;
  supplyName: string;
  unitMeasure: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

const INVOICE_TYPES = [
  { value: "A", label: "Factura A" },
  { value: "B", label: "Factura B" },
] as const;

export function EditSaleDialog({ sale, clients, patients, supplies, onOpenChange }: EditSaleDialogProps) {
  const router = useRouter();
  const [localClientId, setLocalClientId] = useState<string>(sale?.clientId ?? "");
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemError, setItemError] = useState("");

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  // Initialize items when sale changes
  useEffect(() => {
    if (sale?.items) {
      setItems(
        sale.items.map((i) => ({
          supplyId: i.supplyId ?? "",
          pm: i.pm,
          supplyName: i.supplyName,
          unitMeasure: i.unitMeasure,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          subtotal: parseFloat(i.subtotal),
        }))
      );
    } else {
      setItems([]);
    }
    setSelectedSupplyId("");
    setItemQty("1");
    setItemError("");
  }, [sale?.id]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    values: sale
      ? {
          clientId: sale.clientId,
          invoiceType: sale.invoiceType,
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          oc: sale.oc ?? "",
          patient: sale.patient ?? "",
          amount: sale.amount,
        }
      : undefined,
  });

  const clientId = watch("clientId");
  const invoiceType = watch("invoiceType");

  const handleClientChange = (id: string) => {
    setLocalClientId(id);
    setValue("clientId", id, { shouldValidate: true });
    setValue("patient", "");
  };

  const handleAddItem = () => {
    setItemError("");
    const supply = supplies.find((s) => s.id === selectedSupplyId);
    if (!supply) { setItemError("Seleccioná un insumo"); return; }
    const qty = parseFloat(itemQty);
    if (!qty || qty <= 0) { setItemError("Cantidad inválida"); return; }
    const unitPrice = parseFloat(supply.unitPrice);
    const subtotal = parseFloat((qty * unitPrice).toFixed(2));
    const newItems = [
      ...items,
      { supplyId: supply.id, pm: supply.pm, supplyName: supply.name, unitMeasure: supply.unitMeasure, quantity: qty, unitPrice, subtotal },
    ];
    setItems(newItems);
    setSelectedSupplyId("");
    setItemQty("1");
    setValue("amount", newItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2), { shouldValidate: true });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    if (newItems.length > 0) {
      setValue("amount", newItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2), { shouldValidate: true });
    } else {
      setValue("amount", sale?.amount ?? "", { shouldValidate: false });
    }
  };

  const onSubmit = async (data: CreateSaleInput) => {
    if (!sale) return;
    const saleItemInputs: SaleItemInput[] = items.map((i) => ({
      supplyId: i.supplyId,
      pm: i.pm,
      supplyName: i.supplyName,
      unitMeasure: i.unitMeasure,
      quantity: i.quantity.toString(),
      unitPrice: i.unitPrice.toString(),
      subtotal: i.subtotal.toString(),
    }));
    const result = await updateSale(sale.id, data, saleItemInputs);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Editar Venta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <ClientAutocomplete
                clients={clients}
                value={clientId ?? ""}
                onChange={handleClientChange}
                error={errors.clientId?.message}
              />
              {errors.clientId && (
                <p className="text-xs text-destructive">{errors.clientId.message}</p>
              )}
            </div>

            {/* Tipo + Nº Factura + Fecha */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-start">
              <div className="space-y-1.5">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <div className="flex gap-1.5">
                  {INVOICE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setValue("invoiceType", t.value, { shouldValidate: true })}
                      className={`w-10 rounded-md border py-1.5 text-sm font-semibold transition-colors ${
                        invoiceType === t.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-invoiceNumber">Nº Factura <span className="text-destructive">*</span></Label>
                <Input id="edit-invoiceNumber" {...register("invoiceNumber")} />
                {errors.invoiceNumber && (
                  <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Fecha</Label>
                <Input id="edit-date" type="date" {...register("date")} />
              </div>
            </div>

            {/* OC + Paciente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-oc">OC <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input id="edit-oc" {...register("oc")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-patient">Paciente <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <select
                  id="edit-patient"
                  {...register("patient")}
                  disabled={!clientId}
                  className="w-full rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {clientId ? "Seleccionar..." : "Elegir cliente primero"}
                  </option>
                  {patients
                    .filter((p) => p.clientId === (clientId || localClientId))
                    .map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Insumos */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Insumos</p>
                <p className="text-xs text-muted-foreground">Podés agregar, quitar o reemplazar insumos. El monto se recalcula automáticamente.</p>
              </div>

              <div className="space-y-2">
                <select
                  value={selectedSupplyId}
                  onChange={(e) => { setSelectedSupplyId(e.target.value); setItemError(""); }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar insumo por PM o nombre...</option>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.pm} — {s.name} ({s.unitMeasure}) · {formatCurrency(s.unitPrice)}
                    </option>
                  ))}
                </select>
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      placeholder="1"
                      className="w-28"
                    />
                  </div>
                  <Button type="button" variant="default" size="sm" onClick={handleAddItem} className="mb-0.5">
                    <Plus className="h-4 w-4" />
                    Agregar insumo
                  </Button>
                </div>
                {itemError && <p className="text-xs text-destructive">{itemError}</p>}
              </div>

              {items.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-3 rounded-md border border-dashed">
                  Sin insumos agregados
                </p>
              ) : (
                <div className="rounded-md border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left">PM</th>
                        <th className="px-3 py-2 text-left">Insumo</th>
                        <th className="px-3 py-2 text-right">Cant.</th>
                        <th className="px-3 py-2 text-right">P.Unit.</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="w-9" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.pm}</td>
                          <td className="px-3 py-2">{item.supplyName}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.quantity} {item.unitMeasure}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(item.subtotal)}</td>
                          <td className="px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(i)}
                              className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                          Total insumos
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(itemsTotal)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <Label htmlFor="edit-amount">Monto ($) <span className="text-destructive">*</span></Label>
                {items.length > 0 && (
                  <span className="text-xs text-muted-foreground">calculado desde insumos</span>
                )}
              </div>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
                readOnly={items.length > 0}
                className={items.length > 0 ? "bg-muted cursor-not-allowed font-semibold" : ""}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

          </div>

          {/* Footer sticky */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
