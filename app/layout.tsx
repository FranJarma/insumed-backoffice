import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import { getSession } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insumed - Sistema de gestión de ventas e insumos médicos",
  description: "Sistema de gestión de ventas e insumos médicos",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          {session && <Nav user={session} />}
          <main className={session ? "ml-56 min-h-screen bg-muted/20 p-8" : "min-h-screen"}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
