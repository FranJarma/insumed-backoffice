"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, ShoppingBag, Users, TrendingUp, Truck, FileCheck, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Ventas", icon: TrendingUp },
  { href: "/purchases", label: "Compras", icon: ShoppingCart },
  { href: "/misc-purchases", label: "Compras Varias", icon: ShoppingBag },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/providers", label: "Proveedores", icon: Truck },
  { href: "/checks", label: "Cheques", icon: FileCheck },
  { href: "/banks", label: "Bancos", icon: Landmark },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-56 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        {/* Guardá el logo en /public/logo.png */}
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
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-primary text-primary-foreground"
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

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">Insumed v1.0</p>
      </div>
    </aside>
  );
}
