import { TrendingUp, ShoppingCart, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  totalSalesMonth: number;
  totalPurchasesMonth: number;
  totalPending: number;
  monthLabel: string;
}

export function SummaryCards({
  totalSalesMonth,
  totalPurchasesMonth,
  totalPending,
  monthLabel,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Ventas del Mes",
      description: monthLabel,
      value: formatCurrency(totalSalesMonth),
      icon: TrendingUp,
      iconColor: "text-blue-500",
    },
    {
      title: "Compras del Mes",
      description: monthLabel,
      value: formatCurrency(totalPurchasesMonth),
      icon: ShoppingCart,
      iconColor: "text-orange-500",
    },
    {
      title: "A Cobrar",
      description: "Total facturas pendientes",
      value: formatCurrency(totalPending),
      icon: Clock,
      iconColor: "text-yellow-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
