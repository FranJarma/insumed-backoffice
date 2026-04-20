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
    <aside className="fixed inset-y-0 left-0 z-10 flex w-56 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        <img
          src="/logo.webp"
          alt="Insumed"
          className="h-9 w-auto object-contain"
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

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {topLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          ))}

          {/* Insumos con submenú */}
          <li>
            <div className="flex items-stretch rounded-md">
              <Link
                href="/supplies"
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-l-md px-3 py-2 text-sm font-medium transition-colors",
                  isSupplyRoute
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Package className="h-4 w-4" />
                Insumos
              </Link>
              <button
                type="button"
                onClick={() => setSupplyOpen((v) => !v)}
                className={cn(
                  "flex items-center rounded-r-md px-3 transition-colors",
                  isSupplyRoute
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", supplyOpen && "rotate-180")} />
              </button>
            </div>
            {supplyOpen && (
              <ul className="mt-1 space-y-1 pl-7">
                <li>
                  <Link
                    href="/supply-categories"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      pathname === "/supply-categories"
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Categorías
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {bottomLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Usuario */}
      <div className="border-t p-3 space-y-2">
        <div className="px-1">
          <p className="text-sm font-medium leading-none truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
        <div className="space-y-0.5">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname === "/profile"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <UserCircle className="h-4 w-4" />
            Mi perfil
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
