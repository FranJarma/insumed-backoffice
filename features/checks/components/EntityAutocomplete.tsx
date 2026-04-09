"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface EntityAutocompleteProps {
  entities: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function EntityAutocomplete({
  entities,
  value,
  onChange,
  placeholder = "Buscar o escribir...",
  error,
}: EntityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = entities?.filter((e) =>
    e.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
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

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-52 overflow-auto py-1 text-sm">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => {
                    setInputValue(e.name);
                    onChange(e.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                >
                  <span className={e.name === value ? "font-medium" : ""}>{e.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
