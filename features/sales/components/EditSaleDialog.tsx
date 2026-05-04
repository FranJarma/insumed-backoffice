"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
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
import { deleteUploadedFile, fileUrl, uploadFile, validateFile } from "@/lib/upload";

type ClientOption = { id: string; name: string; cuit: string };
type PatientOption = { id: string; name: string; clientId: string };
type CategoryOption = { id: string; name: string };

type SaleItem = {
  id: string;
  supplyId: string | null;
  pm: string;
  supplyName: string;
  quantity: string;
  unitPrice: string;
  priceWithVat?: string | null;
  subtotal: string;
};

type SaleRow = {
  id: string;
  clientId: string;
  invoiceType: "A" | "B" | "AE";
  invoiceNumber: string | null;
  invoiceDate: string | null;
  paymentDate: string | null;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  status: string;
  documentUrl: string | null;
  items?: SaleItem[];
};

interface EditSaleDialogProps {
  sale: SaleRow | null;
  clients: ClientOption[];
  patients: PatientOption[];
  supplies: MockSupply[];
  categories: CategoryOption[];
  onOpenChange: (open: boolean) => void;
}

type ItemDraft = {
  supplyId: string;
  pm: string;
  supplyName: string;
  quantity: number;
  unitPrice: number;
  priceWithVat: number | null;
  subtotal: number;
};

type InvoiceType = "A" | "B" | "AE";

const INVOICE_TYPES = [
  { value: "A", label: "Factura A" },
  { value: "B", label: "Factura B" },
  { value: "AE", label: "Factura AE" },
] as const;

function calcSubtotal(item: Omit<ItemDraft, "subtotal">, invoiceType: InvoiceType): number {
  const price = invoiceType === "B" && item.priceWithVat != null ? item.priceWithVat : item.unitPrice;
  return parseFloat((item.quantity * price).toFixed(2));
}

export function EditSaleDialog({ sale, clients, patients, supplies, categories, onOpenChange }: EditSaleDialogProps) {
  const router = useRouter();
  const [localClientId, setLocalClientId] = useState<string>(sale?.clientId ?? "");
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemError, setItemError] = useState("");
  const [documentKey, setDocumentKey] = useState<string | undefined>();
  const [documentPreview, setDocumentPreview] = useState<string | undefined>();
  const [documentName, setDocumentName] = useState<string | undefined>();
  const [documentError, setDocumentError] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  const isInvoiceable = !sale || sale.status === "PENDING_INVOICE" || sale.status === "INVOICED" || sale.status === "PAID" || sale.status === "INVOICED_PAID" || sale.status === "PENDING";

  // Initialize items when sale changes
  useEffect(() => {
    if (sale?.items) {
      setItems(
        sale.items.map((i) => ({
          supplyId: i.supplyId ?? "",
          pm: i.pm,
          supplyName: i.supplyName,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          priceWithVat: i.priceWithVat ? parseFloat(i.priceWithVat) : null,
          subtotal: parseFloat(i.subtotal),
        }))
      );
    } else {
      setItems([]);
    }
    setSelectedCategory("");
    setSelectedSupplyId("");
    setItemQty("1");
    setItemError("");
    setDocumentKey(sale?.documentUrl ?? undefined);
    setDocumentPreview(sale?.documentUrl && !sale.documentUrl.toLowerCase().endsWith(".pdf") ? fileUrl(sale.documentUrl) : undefined);
    setDocumentName(sale?.documentUrl?.split("/").pop() ?? undefined);
    setDocumentError(undefined);
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
          invoiceNumber: sale.invoiceNumber ?? "",
          invoiceDate: sale.invoiceDate ?? sale.date,
          date: sale.date,
          oc: sale.oc ?? "",
          patient: sale.patient ?? "",
          amount: sale.amount,
          isInvoiced: sale.status === "INVOICED" || sale.status === "INVOICED_PAID" || (sale.status !== "PENDING_INVOICE" && sale.status !== "PAID" && !!sale.invoiceNumber),
          isPaid: sale.status === "PAID" || sale.status === "INVOICED_PAID",
          paymentDate: sale.paymentDate ?? sale.date,
          documentUrl: sale.documentUrl ?? undefined,
        }
      : undefined,
  });

  const clientId = watch("clientId");
  const invoiceType = watch("invoiceType");
  const isInvoiced = watch("isInvoiced");
  const isPaid = watch("isPaid");
  const watchDate = watch("date");

  const handleClientChange = (id: string) => {
    setLocalClientId(id);
    setValue("clientId", id, { shouldValidate: true });
    setValue("patient", "");
  };

  const recalcItems = (newInvoiceType: InvoiceType, currentItems: ItemDraft[]) => {
    return currentItems.map((item) => ({
      ...item,
      subtotal: calcSubtotal(item, newInvoiceType),
    }));
  };

  const handleInvoiceTypeChange = (type: InvoiceType) => {
    setValue("invoiceType", type, { shouldValidate: true });
    const updated = recalcItems(type, items);
    setItems(updated);
    const total = updated.reduce((s, i) => s + i.subtotal, 0);
    if (updated.length > 0) setValue("amount", total.toFixed(2), { shouldValidate: true });
  };

  const handleAddItem = () => {
    setItemError("");
    const supply = supplies.find((s) => s.id === selectedSupplyId);
    if (!supply) { setItemError("Seleccioná un insumo"); return; }
    const qty = parseFloat(itemQty);
    if (!qty || qty <= 0) { setItemError("Cantidad inválida"); return; }
    const unitPrice = parseFloat(supply.unitPrice);
    const priceWithVat = supply.priceWithVat ? parseFloat(supply.priceWithVat) : null;
    const draft: Omit<ItemDraft, "subtotal"> = { supplyId: supply.id, pm: supply.pm, supplyName: supply.name, quantity: qty, unitPrice, priceWithVat };
    const subtotal = calcSubtotal(draft, invoiceType);
    const newItems = [...items, { ...draft, subtotal }];
    setItems(newItems);
    setSelectedSupplyId("");
    setItemQty("1");
    setValue("amount", newItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2), { shouldValidate: true });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setItemError("");
    if (newItems.length > 0) {
      setValue("amount", newItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2), { shouldValidate: true });
    } else {
      setValue("amount", sale?.amount ?? "", { shouldValidate: false });
    }
  };

  const revokeBlobPreview = () => {
    if (documentPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(documentPreview);
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setDocumentError(validationError);
      event.target.value = "";
      return;
    }

    setDocumentError(undefined);
    setIsUploading(true);
    revokeBlobPreview();

    if (file.type.startsWith("image/")) {
      setDocumentPreview(URL.createObjectURL(file));
    } else {
      setDocumentPreview(undefined);
    }

    try {
      const key = await uploadFile(file, {
        directory: "facturas",
        date: watchDate || sale?.date || new Date().toISOString().slice(0, 10),
      });
      if (documentKey && documentKey !== sale?.documentUrl) {
        void deleteUploadedFile(documentKey).catch(() => undefined);
      }
      setDocumentKey(key);
      setDocumentName(file.name);
      setValue("documentUrl", key, { shouldValidate: true });
    } catch {
      setDocumentError("Error al subir el archivo. Intente de nuevo.");
      revokeBlobPreview();
      setDocumentPreview(documentKey && !documentKey.toLowerCase().endsWith(".pdf") ? fileUrl(documentKey) : undefined);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const clearDocument = () => {
    if (documentKey && documentKey !== sale?.documentUrl) {
      void deleteUploadedFile(documentKey).catch(() => undefined);
    }
    revokeBlobPreview();
    setDocumentKey(sale?.documentUrl ?? undefined);
    setDocumentPreview(sale?.documentUrl && !sale.documentUrl.toLowerCase().endsWith(".pdf") ? fileUrl(sale.documentUrl) : undefined);
    setDocumentName(sale?.documentUrl?.split("/").pop() ?? undefined);
    setDocumentError(undefined);
    setValue("documentUrl", sale?.documentUrl ?? undefined, { shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (documentKey && documentKey !== sale?.documentUrl) {
        void deleteUploadedFile(documentKey).catch(() => undefined);
      }
      revokeBlobPreview();
    }
    onOpenChange(open);
  };

  const onSubmit = async (data: CreateSaleInput) => {
    if (!sale) return;
    const saleItemInputs: SaleItemInput[] = items.map((i) => ({
      supplyId: i.supplyId,
      pm: i.pm,
      supplyName: i.supplyName,
      quantity: i.quantity.toString(),
      unitPrice: i.unitPrice.toString(),
      priceWithVat: (i.priceWithVat ?? i.unitPrice).toString(),
      subtotal: i.subtotal.toString(),
    }));
    const result = await updateSale(sale.id, { ...data, documentUrl: documentKey }, saleItemInputs);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  const priceCol = invoiceType === "B" ? "P. c/IVA" : "P. Unit.";
  const hasFile = !!documentKey || !!documentPreview;
  const isPdf = documentName?.toLowerCase().endsWith(".pdf") || documentKey?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={!!sale} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
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

            {/* Tipo + Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <select
                  value={invoiceType}
                  onChange={(e) => handleInvoiceTypeChange(e.target.value as InvoiceType)}
                  className="h-9 w-full rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {INVOICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
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
                <p className="text-xs text-muted-foreground">
                  {invoiceType === "B"
                    ? "Factura B: se usa el precio con IVA para calcular los subtotales."
                    : `${INVOICE_TYPES.find((t) => t.value === invoiceType)?.label}: se usa el precio unitario para calcular los subtotales.`}
                </p>
              </div>

              <div className="space-y-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSupplyId(""); setItemError(""); }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={selectedSupplyId}
                  onChange={(e) => { setSelectedSupplyId(e.target.value); setItemError(""); }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar insumo...</option>
                  {supplies
                    .filter((s) => (s as any).status === "en_deposito" || !(s as any).status)
                    .filter((s) => !selectedCategory || s.category === selectedCategory)
                    .map((s) => {
                      const displayPrice = invoiceType === "B" && s.priceWithVat ? s.priceWithVat : s.unitPrice;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.pm} — {s.name} · {formatCurrency(displayPrice)}
                        </option>
                      );
                    })}
                </select>
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label>Cantidad (lotes)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
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
                        <th className="px-3 py-2 text-right">Lotes</th>
                        <th className="px-3 py-2 text-right">{priceCol}</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="w-9" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const displayPrice = invoiceType === "B" && item.priceWithVat != null ? item.priceWithVat : item.unitPrice;
                        return (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.pm}</td>
                            <td className="px-3 py-2">{item.supplyName}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(displayPrice)}</td>
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
                        );
                      })}
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

            {/* Checkbox "Venta facturada" (solo para estados editables) */}
            {isInvoiceable && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isPaid")}
                    className="h-4 w-4 rounded border-gray-300 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Venta pagada</span>
                    <p className="text-xs text-muted-foreground">Marcá si el pago ya fue recibido.</p>
                  </div>
                </label>

                {isPaid && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="edit-paymentDate">Fecha de pago <span className="text-destructive">*</span></Label>
                    <Input id="edit-paymentDate" type="date" {...register("paymentDate")} />
                    {errors.paymentDate && (
                      <p className="text-xs text-destructive">{errors.paymentDate.message}</p>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isInvoiced")}
                    className="h-4 w-4 rounded border-gray-300 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Venta facturada</span>
                    <p className="text-xs text-muted-foreground">Marcá si la factura ya fue emitida.</p>
                  </div>
                </label>

                {isInvoiced && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                    <Label htmlFor="edit-invoiceNumber">Nº Factura <span className="text-destructive">*</span></Label>
                    <Input id="edit-invoiceNumber" {...register("invoiceNumber")} placeholder="00001-00000001" />
                    {errors.invoiceNumber && (
                      <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-invoiceDate">Fecha de facturación <span className="text-destructive">*</span></Label>
                    <Input id="edit-invoiceDate" type="date" {...register("invoiceDate")} />
                    {errors.invoiceDate && (
                      <p className="text-xs text-destructive">{errors.invoiceDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Comprobante <span className="text-xs text-muted-foreground">(opcional - imagen o PDF)</span></Label>
                    {hasFile ? (
                      <div className="relative w-full overflow-hidden rounded-md border">
                        {isPdf ? (
                          <div className="flex items-center gap-3 bg-muted/50 px-4 py-3">
                            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                            {documentKey ? (
                              <a
                                href={fileUrl(documentKey)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm text-primary hover:underline"
                              >
                                {documentName ?? "Comprobante"}
                              </a>
                            ) : (
                              <span className="truncate text-sm text-muted-foreground">{documentName}</span>
                            )}
                          </div>
                        ) : (
                          <img src={documentPreview} alt="Factura" className="max-h-48 w-full bg-muted object-contain" />
                        )}
                        <button
                          type="button"
                          onClick={clearDocument}
                          className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow-sm hover:bg-background"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                        {isUploading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ImagePlus className="h-4 w-4 shrink-0" />}
                        <span>{isUploading ? "Subiendo archivo..." : "Adjuntar PDF o imagen"}</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                    {documentError && <p className="text-xs text-destructive">{documentError}</p>}
                  </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer sticky */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
