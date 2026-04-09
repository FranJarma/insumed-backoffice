export const RESOURCES = [
  "dashboard",
  "sales",
  "purchases",
  "misc_purchases",
  "clients",
  "patients",
  "supplies",
  "providers",
  "banks",
  "checks",
] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = "read" | "create" | "update" | "delete";
export type Permission = `${Resource}:${Action}`;

const ALL_PERMISSIONS: Permission[] = RESOURCES.flatMap((resource) =>
  (["read", "create", "update", "delete"] as Action[]).map(
    (action) => `${resource}:${action}` as Permission
  )
);

// Permissions por rol. Se irán refinando con el tiempo.
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  jefe: ALL_PERMISSIONS,
  operario: [], // a definir
  admin: ALL_PERMISSIONS,
};

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
