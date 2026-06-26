import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
    // We expect the mock token to be the user ID (e.g. "usr_xxxx")
    if (token && token !== "mock_token") {
      return token;
    }
  } catch (e) {
    console.error("Mock auth cookie retrieval error:", e);
  }
  return null;
}
