import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";
import { hasPermission, type Permission } from "@/lib/permissions";

const getSecret = () => {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET", { minLength: 32 }));
};

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: "jefe" | "operario" | "admin";
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export class AuthorizationError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await requireAuth();
  if (!hasPermission(session.role, permission)) {
    throw new AuthorizationError();
  }
  return session;
}

export async function authorizeAction(permission: Permission) {
  try {
    const session = await requirePermission(permission);
    return { session } as const;
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: { _form: ["No autorizado"] } } as const;
    }
    throw error;
  }
}
