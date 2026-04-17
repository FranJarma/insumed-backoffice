"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession, requireAuth } from "@/lib/auth";
import { hitRateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/request-security";
import { changePasswordSchema, loginSchema } from "../types";

export async function login(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { username, password } = parsed.data;
  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);

  const ipLimit = hitRateLimit(`login:ip:${clientIp}`, {
    maxAttempts: 10,
    windowMs: 10 * 60 * 1000,
  });
  const userLimit = hitRateLimit(`login:user:${username.toLowerCase()}:${clientIp}`, {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!ipLimit.allowed || !userLimit.allowed) {
    return { error: { username: ["Demasiados intentos. Intenta nuevamente mas tarde."] } };
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user || user.deletedAt) {
    return { error: { username: ["Usuario o contraseña incorrectos"] } };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: { username: ["Usuario o contraseña incorrectos"] } };
  }

  await createSession({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function changePassword(input: unknown) {
  const session = await requireAuth();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);

  if (!user) {
    return { error: { currentPassword: ["Usuario no encontrado"] } };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: { currentPassword: ["contraseña actual incorrecta"] } };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  await createSession({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });

  return { success: true };
}
