"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { monthLabel, nextMonth, prevMonth } from "@/lib/utils";

export function currentYear() {
  return new Date().getFullYear();
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_YEAR_OPTIONS = Array.from(
  { length: 5 },
  (_, index) => currentYear() - 2 + index
);

interface PeriodFilterProps {
  selectedYear: number;
  selectedMonth: string;
  isFullYear: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: string) => void;
  onFullYearChange: (isFullYear: boolean) => void;
  years?: number[];
}

export function PeriodFilter({
  selectedYear,
  selectedMonth,
  isFullYear,
  onYearChange,
  onMonthChange,
  onFullYearChange,
  years = DEFAULT_YEAR_OPTIONS,
}: PeriodFilterProps) {
  const effectiveMonth = `${selectedYear}-${selectedMonth.slice(5)}`;

  const handleYearChange = (year: number) => {
    onYearChange(year);
    onMonthChange(`${year}-${selectedMonth.slice(5)}`);
  };

  const handleMonthNav = (direction: "prev" | "next") => {
    const newMonth = direction === "prev" ? prevMonth(effectiveMonth) : nextMonth(effectiveMonth);
    onMonthChange(newMonth);
    onYearChange(parseInt(newMonth.slice(0, 4)));
  };

  return (
    <>
      <select
        value={selectedYear}
        onChange={(event) => handleYearChange(parseInt(event.target.value))}
        className="rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
        <input
          type="checkbox"
          checked={isFullYear}
          onChange={(event) => onFullYearChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-primary"
        />
        Año completo
      </label>

      {!isFullYear && (
        <div className="flex items-center gap-1 rounded-md border bg-card px-1 py-1.5">
          <button onClick={() => handleMonthNav("prev")} className="rounded px-1 hover:bg-muted" type="button">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {monthLabel(effectiveMonth)}
          </span>
          <button onClick={() => handleMonthNav("next")} className="rounded px-1 hover:bg-muted" type="button">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
