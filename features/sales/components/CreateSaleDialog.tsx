"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusCircle, ImagePlus, X, Plus, Trash2, Loader2, FileText } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSale } from "../actions";
import { createSaleSchema, type CreateSaleInput, type SaleItemInput } from "../types";
import type { MockSupply } from "@/db/mock-store";
import { ClientAutocomplete } from "./ClientAutocomplete";
import { formatCurrency } from "@/lib/utils";
import { uploadFile, validateFile, fileUrl } from "@/lib/upload";

type ClientOption = { id: string; name: string; cuit: string };
type PatientOption = { id: string; name: string; clientId: string };

interface CreateSaleDialogProps {
  clients: ClientOption[];
  patients: PatientOption[];
  supplies: MockSupply[];
}

type ItemDraft = {
  supplyId: string; pm: string; supplyName: string; unitMeasure: string;
  quantity: number; unitPrice: number; subtotal: number;
};

const INVOICE_TYPES = [
  { value: "A", label: "Factura A" },
  { value: "B", label: "Factura B" },
] as const;

export function CreateSaleDialog({ clients, patients, supplies }: CreateSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [documentKey, setDocumentKey] = useState<string | undefined>();
  const [documentPreview, setDocumentPreview] = useState<string | undefined>(); // local object URL for preview only
  const [documentName, setDocumentName] = useState<string | undefined>();
  const [documentError, setDocumentError] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [items, setItems] = useState<ItemDraft[]>([]);
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemError, setItemError] = useState("");

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  const defaultValues: Partial<CreateSaleInput> = {
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    invoiceType: "A",
  };

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues,
  });

  const clientId = watch("clientId");
  const invoiceType = watch("invoiceType");
  const watchDate = watch("date");

  const handleAddItem = () => {
    setItemError("");
    const supply = supplies.find((s) => s.id === selectedSupplyId);
    if (!supply) { setItemError("Seleccioná un insumo"); return; }
    const qty = parseFloat(itemQty);
    if (!qty || qty <= 0) { setItemError("Cantidad inválida"); return; }
    const unitPrice = parseFloat(supply.unitPrice);
    const subtotal = parseFloat((qty * unitPrice).toFixed(2));
    const newItems = [...items, { supplyId: supply.id, pm: supply.pm, supplyName: supply.name, unitMeasure: supply.unitMeasure, quantity: qty, unitPrice, subtotal }];
    setItems(newItems);
    setSelectedSupplyId("");
    setItemQty("1");
    setValue("amount", newItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2), { shouldValidate: true });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setValue("amount", newItems.length > 0 ? newItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2) : "", { shouldValidate: newItems.length > 0 });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setDocumentError(err); e.target.value = ""; return; }

    setDocumentError(undefined);
    setIsUploading(true);
    // Local preview immediately (images only)
    if (file.type.startsWith("image/")) {
      setDocumentPreview(URL.createObjectURL(file));
    }
    try {
      const key = await uploadFile(file, {
        directory: "facturas",
        date: watchDate || defaultValues.date!,
      });
      setDocumentKey(key);
      setDocumentName(file.name);
    } catch {
      setDocumentError("Error al subir el archivo. Intente de nuevo.");
      if (documentPreview) { URL.revokeObjectURL(documentPreview); setDocumentPreview(undefined); }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const clearDocument = () => {
    if (documentPreview) URL.revokeObjectURL(documentPreview);
    setDocumentKey(undefined);
    setDocumentPreview(undefined);
    setDocumentName(undefined);
    setDocumentError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CreateSaleInput) => {
    const saleItemInputs: SaleItemInput[] = items.map((i) => ({
      supplyId: i.supplyId, pm: i.pm, supplyName: i.supplyName, unitMeasure: i.unitMeasure,
      quantity: i.quantity.toString(), unitPrice: i.unitPrice.toString(), subtotal: i.subtotal.toString(),
    }));
    const result = await createSale({ ...data, documentUrl: documentKey }, saleItemInputs);
    if ("success" in result) {
      setOpen(false);
      reset(defaultValues);
      clearDocument();
      setItems([]);
      setSelectedSupplyId("");
      setItemQty("1");
      router.refresh();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset(defaultValues);
      clearDocument();
      setItems([]);
      setSelectedSupplyId("");
      setItemQty("1");
      setItemError("");
    }
    setOpen(isOpen);
  };

  const hasFile = documentKey || documentPreview;
  const isImage = hasFile && !documentName?.endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="h-4 w-4" />Nueva Venta</Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Registrar Venta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <ClientAutocomplete
                clients={clients}
                value={clientId ?? ""}
                onChange={(id) => { setValue("clientId", id, { shouldValidate: true }); setValue("patient", ""); }}
                error={errors.clientId?.message}
              />
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>

            {/* Tipo + Nº Factura + Fecha */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-start">
              <div className="space-y-1.5">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <div className="flex gap-1.5">
                  {INVOICE_TYPES.map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => setValue("invoiceType", t.value, { shouldValidate: true })}
                      className={`w-10 rounded-md border py-1.5 text-sm font-semibold transition-colors ${
                        invoiceType === t.value ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}>{t.value}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoiceNumber">Nº Factura <span className="text-destructive">*</span></Label>
                <Input id="invoiceNumber" {...register("invoiceNumber")} placeholder="00001" />
                {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" {...register("date")} />
              </div>
            </div>

            {/* OC + Paciente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="oc">OC <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input id="oc" {...register("oc")} placeholder="OC-2025-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patient">Paciente <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <select id="patient" {...register("patient")} disabled={!clientId}
                  className="w-full rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">{clientId ? "Seleccionar..." : "Elegir cliente primero"}</option>
                  {patients.filter((p) => p.clientId === clientId).map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Insumos */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Insumos</p>
                <p className="text-xs text-muted-foreground">Podés agregar varios insumos. El monto se calcula automáticamente.</p>
              </div>
              <div className="space-y-2">
                <select value={selectedSupplyId} onChange={(e) => { setSelectedSupplyId(e.target.value); setItemError(""); }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Seleccionar insumo por PM o nombre...</option>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>{s.pm} — {s.name} ({s.unitMeasure}) · {formatCurrency(s.unitPrice)}</option>
                  ))}
                </select>
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label>Cantidad</Label>
                    <Input type="number" min="0.01" step="0.01" value={itemQty} onChange={(e) => setItemQty(e.target.value)} placeholder="1" className="w-28" />
                  </div>
                  <Button type="button" variant="default" size="sm" onClick={handleAddItem} className="mb-0.5">
                    <Plus className="h-4 w-4" />Agregar insumo
                  </Button>
                </div>
                {itemError && <p className="text-xs text-destructive">{itemError}</p>}
              </div>
              {items.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-3 rounded-md border border-dashed">Sin insumos agregados</p>
              ) : (
                <div className="rounded-md border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left">PM</th><th className="px-3 py-2 text-left">Insumo</th>
                        <th className="px-3 py-2 text-right">Cant.</th><th className="px-3 py-2 text-right">P.Unit.</th>
                        <th className="px-3 py-2 text-right">Subtotal</th><th className="w-9" />
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
                            <button type="button" onClick={() => handleRemoveItem(i)}
                              className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total insumos</td>
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
                <Label htmlFor="amount">Monto ($) <span className="text-destructive">*</span></Label>
                {items.length > 0 && <span className="text-xs text-muted-foreground">calculado desde insumos</span>}
              </div>
              <Input id="amount" type="number" step="0.01" min="0" {...register("amount")}
                readOnly={items.length > 0} placeholder="150000.00"
                className={items.length > 0 ? "bg-muted cursor-not-allowed font-semibold" : ""} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            {/* Foto / PDF de la factura */}
            <div className="space-y-1.5">
              <Label>Factura <span className="text-xs text-muted-foreground">(opcional — imagen o PDF)</span></Label>
              {hasFile ? (
                <div className="relative w-full overflow-hidden rounded-md border">
                  {isImage ? (
                    <img src={documentPreview} alt="Factura" className="max-h-48 w-full object-contain bg-muted" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      {documentKey ? (
                        <a href={fileUrl(documentKey)} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate">{documentName}</a>
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">{documentName}</span>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={clearDocument}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1 hover:bg-background shadow-sm">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                  {isUploading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ImagePlus className="h-4 w-4 shrink-0" />}
                  <span>{isUploading ? "Subiendo archivo..." : "Imagen (se comprime a 1 MB) · PDF máx. 2 MB"}</span>
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
                </label>
              )}
              {documentError && <p className="text-xs text-destructive">{documentError}</p>}
            </div>

          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Guardando..." : "Guardar Venta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
