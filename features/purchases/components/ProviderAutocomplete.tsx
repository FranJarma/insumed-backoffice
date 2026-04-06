"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Check, ChevronDown, Loader2, PlusCircle } from "lucide-react";
import { createProvider } from "@/features/providers/actions";

interface ProviderAutocompleteProps {
  providers: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function ProviderAutocomplete({
  providers,
  value,
  onChange,
  placeholder = "Buscar o escribir proveedor...",
  error,
}: ProviderAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [isCreating, startCreate] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = providers.filter((p) =>
    p.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = providers.some(
    (p) => p.name.toLowerCase() === inputValue.toLowerCase()
  );

  const showCreate = inputValue.trim().length > 0 && !exactMatch;

  const handleSelect = (name: string) => {
    setInputValue(name);
    onChange(name);
    setOpen(false);
  };

  const handleCreate = () => {
    const name = inputValue.trim();
    if (!name) return;
    startCreate(async () => {
      await createProvider({ name });
      onChange(name);
      setOpen(false);
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={`w-full rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
            error ? "border-destructive" : ""
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-52 overflow-auto py-1 text-sm">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(p.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                >
                  {p.name === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  <span className={p.name === value ? "font-medium" : ""}>{p.name}</span>
                </button>
              </li>
            ))}

            {showCreate && (
              <li className="border-t">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-primary hover:bg-accent"
                >
                  {isCreating ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {isCreating ? "Creando..." : `Crear "${inputValue.trim()}"`}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
