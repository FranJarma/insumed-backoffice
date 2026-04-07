import { getClients } from "@/features/clients/actions";
import { getPatientsWithClient } from "@/features/patients/actions";
import { PatientsTable } from "@/features/patients/components/PatientsTable";
import { CreatePatientDialog } from "@/features/patients/components/CreatePatientDialog";

export default async function PatientsPage() {
  const [patientsData, clientsData] = await Promise.all([
    getPatientsWithClient(),
    getClients(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">
            Pacientes registrados por obra social / cliente
          </p>
        </div>
        <CreatePatientDialog clients={clientsData} />
      </div>
      <PatientsTable patients={patientsData} clients={clientsData} />
    </div>
  );
}
