import { getBanks } from "@/features/banks/actions";
import { BanksTable } from "@/features/banks/components/BanksTable";
import { CreateBankDialog } from "@/features/banks/components/CreateBankDialog";

export default async function BanksPage() {
  const banksData = await getBanks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bancos</h1>
          <p className="text-muted-foreground">Bancos disponibles para cheques</p>
        </div>
        <CreateBankDialog />
      </div>
      <BanksTable banks={banksData} />
    </div>
  );
}
