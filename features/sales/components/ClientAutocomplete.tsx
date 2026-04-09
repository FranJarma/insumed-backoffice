"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Check, ChevronDown, Loader2, PlusCircle, X } from "lucide-react";
import { createClient } from "@/features/clients/actions";

interface ClientOption {
  id: string;
  name: string;
}

interface ClientAutocompleteProps {
  clients: ClientOption[];
  value: string; // clientId (UUID)
  onChange: (clientId: string) => void;
  error?: string;
}

export function ClientAutocomplete({ clients, value, onChange, error }: ClientAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [creatingMode, setCreatingMode] = useState(false);
  const [newCuit, setNewCuit] = useState("");
  const [cuitError, setCuitError] = useState("");
  const [isCreating, startCreate] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show selected client name in input when value is set
  useEffect(() => {
    const selected = clients.find((c) => c.id === value);
    if (selected) setInputValue(selected.name);
  }, [value, clients]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreatingMode(false);
        setNewCuit("");
        setCuitError("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = clients.some(
    (c) => c.name.toLowerCase() === inputValue.toLowerCase()
  );

  const showCreate = inputValue.trim().length > 0 && !exactMatch;

  const handleSelect = (client: ClientOption) => {
    setInputValue(client.name);
    onChange(client.id);
    setOpen(false);
    setCreatingMode(false);
  };

  const handleStartCreate = () => {
    setCreatingMode(true);
    setNewCuit("");
    setCuitError("");
  };

  const handleConfirmCreate = () => {
    if (!newCuit.trim()) {
      setCuitError("El CUIT es requerido");
      return;
    }
    const name = inputValue.trim();
    startCreate(async () => {
      const result = await createClient({ name, cuit: newCuit.trim() });
      if ("clientId" in result && result.clientId) {
        onChange(result.clientId);
        setOpen(false);
        setCreatingMode(false);
        setNewCuit("");
        setCuitError("");
      }
    });
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setCreatingMode(false);
  };

  const selectedName = clients.find((c) => c.id === value)?.name;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder="Buscar o escribir cliente..."
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (value) onChange(""); // clear selection when typing
            setOpen(true);
            setCreatingMode(false);
          }}
          className={`w-full rounded-md border bg-background px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
            error ? "border-destructive" : ""
          }`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedName && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
            className="text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-52 overflow-auto py-1 text-sm">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(c)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                >
                  {c.id === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  <span className={c.id === value ? "font-medium" : ""}>{c.name}</span>
                </button>
              </li>
            ))}

            {showCreate && !creatingMode && (
              <li className="border-t">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleStartCreate}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-primary hover:bg-accent"
                >
                  <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Crear cliente "{inputValue.trim()}"</span>
                </button>
              </li>
            )}

            {showCreate && creatingMode && (
              <li className="border-t p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Nuevo cliente: <span className="text-foreground">{inputValue.trim()}</span>
                </p>
                <input
                  type="text"
                  placeholder="CUIT (requerido)"
                  value={newCuit}
                  onChange={(e) => { setNewCuit(e.target.value); setCuitError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmCreate()}
                  className={`w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                    cuitError ? "border-destructive" : ""
                  }`}
                  autoFocus
                />
                {cuitError && <p className="text-xs text-destructive">{cuitError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleConfirmCreate}
                    disabled={isCreating}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                    {isCreating ? "Creando..." : "Crear"}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setCreatingMode(false)}
                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
