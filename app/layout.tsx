import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insumed - Sistema de gestión de ventas e insumos médicos",
  description: "Sistema de gestión de ventas e insumos médicos",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Nav />
        <main className="ml-56 min-h-screen bg-muted/20 p-8">{children}</main>
      </body>
    </html>
  );
}
