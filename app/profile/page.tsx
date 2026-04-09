import { requireAuth } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

const ROLE_LABELS: Record<string, string> = {
  jefe: "Jefe",
  operario: "Operario",
  admin: "Administrador",
};

export default async function ProfilePage() {
  const session = await requireAuth();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Información de tu cuenta</p>
      </div>

      {/* Datos del usuario */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Datos personales</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Nombre</p>
            <p className="font-medium">{session.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Usuario</p>
            <p className="font-medium">{session.username}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Rol</p>
            <p className="font-medium">{ROLE_LABELS[session.role] ?? session.role}</p>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Cambiar contraseña</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
