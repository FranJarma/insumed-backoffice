"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Users,
  TrendingUp,
  Truck,
  FileCheck,
  Landmark,
  UserRound,
  Package,
  Tag,
  ChevronDown,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/features/auth/actions";
import { Tooltip } from "@/components/ui/tooltip";
import type { SessionUser } from "@/lib/auth";

const topLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Ventas", icon: TrendingUp },
  { href: "/purchases", label: "Compras", icon: ShoppingCart },
  { href: "/misc-purchases", label: "Compras Varias", icon: ShoppingBag },
  { href: "/checks", label: "Cheques", icon: FileCheck },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/patients", label: "Pacientes", icon: UserRound },
];

const bottomLinks = [
  { href: "/providers", label: "Proveedores", icon: Truck },
  { href: "/banks", label: "Bancos", icon: Landmark },
];

const ROLE_LABELS: Record<string, string> = {
  jefe: "Jefe",
  operario: "Operario",
  admin: "Administrador",
};

interface NavProps {
  user: SessionUser;
}

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const isSupplyRoute = pathname.startsWith("/supplies") || pathname.startsWith("/supply-");
  const [supplyOpen, setSupplyOpen] = useState(isSupplyRoute);

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-16 flex-col border-r bg-background transition-[width] duration-200 2xl:w-56">
      <div className="flex h-16 items-center justify-center border-b px-2 2xl:px-4">
        <img
          src="/logo.webp"
          alt="Insumed"
          className="h-4 w-auto object-contain md:h-6"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            target.nextElementSibling?.removeAttribute("hidden");
          }}
        />
        <span hidden className="text-lg font-bold tracking-tight text-primary">
          Insumed
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 2xl:p-3">
        <ul className="space-y-1">
          {topLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Tooltip label={label} side="right">
                <Link
                  href={href}
                  aria-label={label}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors 2xl:h-auto 2xl:justify-start 2xl:gap-3 2xl:px-3 2xl:py-2",
                    pathname === href || pathname.startsWith(href + "/")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden 2xl:inline">{label}</span>
                </Link>
              </Tooltip>
            </li>
          ))}

          <li>
            <div className="flex items-stretch rounded-md">
              <Tooltip label="Insumos" side="right">
                <Link
                  href="/supplies"
                  aria-label="Insumos"
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors 2xl:h-auto 2xl:justify-start 2xl:gap-3 2xl:rounded-l-md 2xl:rounded-r-none 2xl:px-3 2xl:py-2",
                    isSupplyRoute
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Package className="h-4 w-4 shrink-0" />
                  <span className="hidden 2xl:inline">Insumos</span>
                </Link>
              </Tooltip>
              <button
                type="button"
                onClick={() => setSupplyOpen((v) => !v)}
                className={cn(
                  "hidden items-center rounded-r-md px-3 transition-colors 2xl:flex",
                  isSupplyRoute
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-label={supplyOpen ? "Ocultar submenu de insumos" : "Mostrar submenu de insumos"}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", supplyOpen && "rotate-180")} />
              </button>
            </div>

            <Tooltip label="Categorias" side="right">
              <Link
                href="/supply-categories"
                aria-label="Categorias"
                className={cn(
                  "mt-1 flex h-10 items-center justify-center rounded-md transition-colors 2xl:hidden",
                  pathname === "/supply-categories"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Tag className="h-4 w-4 shrink-0" />
              </Link>
            </Tooltip>

            {supplyOpen && (
              <ul className="mt-1 hidden space-y-1 pl-7 2xl:block">
                <li>
                  <Link
                    href="/supply-categories"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      pathname === "/supply-categories"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Categorias</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {bottomLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Tooltip label={label} side="right">
                <Link
                  href={href}
                  aria-label={label}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors 2xl:h-auto 2xl:justify-start 2xl:gap-3 2xl:px-3 2xl:py-2",
                    pathname === href || pathname.startsWith(href + "/")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden 2xl:inline">{label}</span>
                </Link>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2 border-t p-2 2xl:p-3">
        <div className="hidden px-1 2xl:block">
          <p className="truncate text-sm font-medium leading-none">{user.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
        <div className="space-y-0.5">
          <Tooltip label="Mi perfil" side="right">
            <Link
              href="/profile"
              aria-label="Mi perfil"
              className={cn(
                "flex h-10 items-center justify-center rounded-md text-sm transition-colors 2xl:h-auto 2xl:justify-start 2xl:gap-2 2xl:px-2 2xl:py-1.5",
                pathname === "/profile"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <UserCircle className="h-4 w-4 shrink-0" />
              <span className="hidden 2xl:inline">Mi perfil</span>
            </Link>
          </Tooltip>
          <form action={logout}>
            <Tooltip label="Cerrar sesion" side="right">
              <button
                type="submit"
                aria-label="Cerrar sesion"
                className="flex h-10 w-full items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground 2xl:h-auto 2xl:justify-start 2xl:gap-2 2xl:px-2 2xl:py-1.5"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden 2xl:inline">Cerrar sesion</span>
              </button>
            </Tooltip>
          </form>
        </div>
      </div>
    </aside>
  );
}
