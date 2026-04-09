import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { requireEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Página de login: pública
  if (pathname === "/login") return NextResponse.next();

  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(requireEnv("SESSION_SECRET", { minLength: 32 }));
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
