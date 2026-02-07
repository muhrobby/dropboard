import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UnauthorizedError } from "@/lib/errors";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Authentication required");
  }
  return session;
}
