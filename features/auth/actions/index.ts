"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { loginSchema, changePasswordSchema } from "../types";

export async function login(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { username, password } = parsed.data;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

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
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  if (!user) {
    return { error: { currentPassword: ["Usuario no encontrado"] } };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: { currentPassword: ["Contraseña actual incorrecta"] } };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  return { success: true };
}
