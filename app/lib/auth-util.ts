import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const isClerkConfigured = !!clerkKey && clerkKey.startsWith("pk_") && !clerkKey.includes("your_");

export async function getUserId(): Promise<string | null> {
  if (isClerkConfigured) {
    try {
      const { userId } = await auth();
      return userId || null;
    } catch (e) {
      console.error("Clerk auth() error:", e);
      return null;
    }
  }

  // Fallback Mock Auth: retrieve user ID from cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("py_auth_token")?.value;
    if (token && token.trim().length > 0) {
      return token;
    }
  } catch (e) {
    console.error("Mock auth cookie retrieval error:", e);
  }
  return null;
}
