import { format, endOfMonth, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { and, desc, eq, gte, lte, ne, sum } from "drizzle-orm";
import { mockGetDashboardData } from "@/db/mock-store";
import { getDb } from "@/db";
import { clients, purchases, sales } from "@/db/schema";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { TopClientsTable } from "@/features/dashboard/components/TopClientsTable";
import { requirePermission } from "@/lib/auth";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

async function getDashboardData(monthStart: string, monthEnd: string) {
  if (USE_MOCK) return mockGetDashboardData(monthStart, monthEnd);

  const db = getDb();

  const [salesResult] = await db
    .select({ total: sum(sales.amount) })
    .from(sales)
    .where(
      and(
        ne(sales.status, "CANCELLED"),
        gte(sales.date, monthStart),
        lte(sales.date, monthEnd)
      )
    );

  const [purchasesResult] = await db
    .select({ total: sum(purchases.amount) })
    .from(purchases)
    .where(and(gte(purchases.date, monthStart), lte(purchases.date, monthEnd)));

  const [pendingResult] = await db
    .select({ total: sum(sales.amount) })
    .from(sales)
    .where(eq(sales.status, "PENDING"));

  const topClients = await db
    .select({ name: clients.name, total: sum(sales.amount) })
    .from(sales)
    .innerJoin(clients, eq(sales.clientId, clients.id))
    .where(eq(sales.status, "PENDING"))
    .groupBy(clients.name)
    .orderBy(desc(sum(sales.amount)))
    .limit(5);

  return {
    totalSalesMonth: salesResult?.total ? parseFloat(salesResult.total) : 0,
    totalPurchasesMonth: purchasesResult?.total ? parseFloat(purchasesResult.total) : 0,
    totalPending: pendingResult?.total ? parseFloat(pendingResult.total) : 0,
    topClients: topClients.map((c) => ({
      name: c.name,
      total: c.total ? parseFloat(c.total) : 0,
    })),
  };
}

export default async function DashboardPage() {
  await requirePermission("dashboard:read");

  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const monthLabel = format(now, "MMMM yyyy", { locale: es });

  const { totalSalesMonth, totalPurchasesMonth, totalPending, topClients } =
    await getDashboardData(monthStart, monthEnd);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido a Insumed</h1>
      </div>
    </div>
  );
}
