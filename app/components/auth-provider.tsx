"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ClerkProvider, UserButton as ClerkUserButton, SignIn as ClerkSignIn, SignUp as ClerkSignUp, useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/nextjs";
import { Eye, EyeOff, LogOut, ArrowUpRight } from "lucide-react";

// Check if Clerk is configured
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const isClerkConfigured = !!clerkKey && clerkKey.startsWith("pk_") && !clerkKey.includes("your_");

// ── Design tokens (shared with the sign-in / sign-up hero panels) ──────────
// Only the tokens referenced via inline style below are kept here; the rest
// of the palette is applied directly as Tailwind arbitrary-value classes.
const GRAPHITE = "#74786F";
const mono = { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };

// Mock Auth Context
interface MockAuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    imageUrl: string;
    emailAddress: string;
  } | null;
  signIn: (email: string) => void;
  signUp: (email: string, firstName: string, lastName: string) => void;
  signOut: () => void;
}

const MockAuthContext = createContext<MockAuthContextType>({
  isSignedIn: false,
  isLoaded: false,
  userId: null,
  user: null,
  signIn: () => { },
  signUp: () => { },
  signOut: () => { },
});

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<MockAuthContextType["user"]>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Read auth status from localStorage and sync cookie
    const savedAuth = localStorage.getItem("py_auth_user");
    if (savedAuth) {
      try {
        const u = JSON.parse(savedAuth);
        setUser(u);
        setIsSignedIn(true);
        document.cookie = `py_auth_token=${u.id}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (e) {
        localStorage.removeItem("py_auth_user");
        document.cookie = "py_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      }
    }
    setIsLoaded(true);
  }, []);

  // Simple route guard simulation
  useEffect(() => {
    if (!isLoaded) return;
    const publicPaths = ["/sign-in", "/sign-up"];
    const isPublicPath = publicPaths.includes(pathname);
    if (!isSignedIn && !isPublicPath && pathname !== "/") {
      router.push("/sign-in");
    } else if (isSignedIn && isPublicPath) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isLoaded, pathname, router]);

  const signIn = (email: string) => {
    const firstName = email.split("@")[0];
    const mockUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
      lastName: "User",
      fullName: (firstName.charAt(0).toUpperCase() + firstName.slice(1)) + " User",
      imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName}`,
      emailAddress: email,
    };
    localStorage.setItem("py_auth_user", JSON.stringify(mockUser));
    // Set a long-lived cookie for middleware and server requests
    document.cookie = `py_auth_token=${mockUser.id}; path=/; max-age=31536000; SameSite=Lax`;
    setUser(mockUser);
    setIsSignedIn(true);
    router.push("/dashboard");
  };

  const signUp = (email: string, firstName: string, lastName: string) => {
    const mockUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName}`,
      emailAddress: email,
    };
    localStorage.setItem("py_auth_user", JSON.stringify(mockUser));
    document.cookie = `py_auth_token=${mockUser.id}; path=/; max-age=31536000; SameSite=Lax`;
    setUser(mockUser);
    setIsSignedIn(true);
    router.push("/dashboard");
  };

  const signOut = () => {
    localStorage.removeItem("py_auth_user");
    // Clear cookie
    document.cookie = "py_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    setUser(null);
    setIsSignedIn(false);
    router.push("/sign-in");
  };

  return (
    <MockAuthContext.Provider
      value={{
        isSignedIn,
        isLoaded,
        userId: user ? user.id : null,
        user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

// Wrapper for entire app Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isClerkConfigured) {
    return <ClerkProvider afterSignOutUrl="/sign-in">{children}</ClerkProvider>;
  }
  return <MockAuthProvider>{children}</MockAuthProvider>;
}

// Unified Hooks
export function useAuth() {
  if (isClerkConfigured) {
    const { isSignedIn, isLoaded, userId, signOut } = useClerkAuth();
    return { isSignedIn, isLoaded, userId, signOut };
  } else {
    const { isSignedIn, isLoaded, userId, signOut } = useContext(MockAuthContext);
    return { isSignedIn, isLoaded, userId, signOut };
  }
}

export function useUser() {
  if (isClerkConfigured) {
    const { isSignedIn, isLoaded, user } = useClerkUser();
    if (!user) return { isSignedIn, isLoaded, user: null };
    return {
      isSignedIn,
      isLoaded,
      user: {
        id: user.id,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        fullName: user.fullName || "",
        imageUrl: user.imageUrl,
        emailAddress: user.emailAddresses[0]?.emailAddress || "",
      },
    };
  } else {
    const { isSignedIn, isLoaded, user } = useContext(MockAuthContext);
    return { isSignedIn, isLoaded, user };
  }
}

// Helper components
export function SignedIn({ children }: { children: React.ReactNode }) {
  if (isClerkConfigured) {
    return <ClerkSignedInWrapper>{children}</ClerkSignedInWrapper>;
  }
  return <SignedInMock>{children}</SignedInMock>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  if (isClerkConfigured) {
    return <ClerkSignedOutWrapper>{children}</ClerkSignedOutWrapper>;
  }
  return <SignedOutMock>{children}</SignedOutMock>;
}

function ClerkSignedInWrapper({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

function ClerkSignedOutWrapper({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}

function SignedInMock({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useContext(MockAuthContext);
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

function SignedOutMock({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useContext(MockAuthContext);
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}

// Sleek drop-in Custom UserButton component
export function UserButton() {
  const router = useRouter();
  if (isClerkConfigured) {
    return <ClerkUserButton />;
  }

  return <MockUserButton />;
}

function MockUserButton() {
  const { user, signOut } = useContext(MockAuthContext);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A2B] focus-visible:ring-offset-2"
      >
        <img
          src={user.imageUrl}
          alt={user.fullName}
          className="h-9 w-9 rounded-md border border-[#DBDED4] bg-white p-0.5 hover:border-[#15191F]/40 transition-colors"
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-[#DBDED4] bg-white p-2 shadow-lg">
            <div className="mb-1 border-b border-[#EFF1EA] px-3 py-2">
              <p className="text-sm font-semibold text-[#15191F]">{user.fullName}</p>
              <p className="truncate text-xs" style={{ ...mono, color: GRAPHITE }}>{user.emailAddress}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-[#B23A15] transition-colors hover:bg-[#EA5A2B]/[0.08]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Export Auth Form configurations
export function SignIn() {
  if (isClerkConfigured) {
    return <ClerkSignIn routing="path" path="/sign-in" />;
  }
  return <MockSignInForm />;
}

export function SignUp() {
  if (isClerkConfigured) {
    return <ClerkSignUp routing="path" path="/sign-up" />;
  }
  return <MockSignUpForm />;
}

function MockSignInForm() {
  const { signIn } = useContext(MockAuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      signIn(email);
    }, 400);
  };

  const handleQuickSignIn = (demoEmail: string) => {
    setEmail(demoEmail);
    setIsLoading(true);
    setTimeout(() => {
      signIn(demoEmail);
    }, 300);
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-[#DBDED4] bg-white p-8 sm:p-10">
      {/* Header */}
      <div className="mb-7">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-[#DBDED4] bg-[#F2F4EF] px-2.5 py-1 text-[10px] font-semibold" style={mono}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          <span style={{ color: GRAPHITE }}>ACCESS · DEMO MODE</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#15191F] sm:text-[1.75rem]">
          Sign in to Weav
        </h2>
        <p className="mt-1.5 text-sm text-[#5B5F54]">
          Pick up where you left off, or try a demo workspace below.
        </p>
      </div>

      {/* Quick Demo Presets */}
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
          Demo accounts
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickSignIn("alex.engineer@weav.ai")}
            className="group flex items-center gap-2.5 rounded-md border border-[#DBDED4] bg-[#F2F4EF] px-3.5 py-2.5 text-left transition-colors hover:border-[#15191F]/30 hover:bg-white"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#15191F] text-xs font-bold text-white" style={mono}>
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#15191F]">Alex Chen</p>
              <p className="truncate text-[10px]" style={{ ...mono, color: GRAPHITE }}>AI Lead</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSignIn("sarah.smith@weav.ai")}
            className="group flex items-center gap-2.5 rounded-md border border-[#DBDED4] bg-[#F2F4EF] px-3.5 py-2.5 text-left transition-colors hover:border-[#15191F]/30 hover:bg-white"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#33608A] text-xs font-bold text-white" style={mono}>
              S
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#15191F]">Sarah Smith</p>
              <p className="truncate text-[10px]" style={{ ...mono, color: GRAPHITE }}>Architect</p>
            </div>
          </button>
        </div>
      </div>

      <div className="relative my-6 flex items-center justify-center">
        <span className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-dashed border-[#DBDED4]" />
        </span>
        <span className="relative bg-white px-3 text-[10px] font-semibold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
          Or sign in with email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#15191F]">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            className="w-full rounded-md border border-[#DBDED4] bg-[#F9FAF7] px-4 py-2.5 text-sm text-[#15191F] placeholder-[#9CA093] transition-all focus:border-[#EA5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA5A2B]/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#15191F]">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-[#DBDED4] bg-[#F9FAF7] px-4 py-2.5 pr-10 text-sm text-[#15191F] placeholder-[#9CA093] transition-all focus:border-[#EA5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA5A2B]/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA093] transition-colors hover:text-[#15191F]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-[#EA5A2B] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#D64F22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A2B] focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-70"
        >
          {isLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              Sign in
              <ArrowUpRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 text-center">
        <p className="text-xs text-[#5B5F54]">
          New to Weav?{" "}
          <a href="/sign-up" className="font-bold text-[#33608A] hover:text-[#264A6C]">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}

function MockSignUpForm() {
  const { signUp } = useContext(MockAuthContext);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) return;
    setIsLoading(true);
    setTimeout(() => {
      signUp(email, firstName, lastName);
    }, 400);
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-[#DBDED4] bg-white p-8 sm:p-10">
      <div className="mb-7">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-[#DBDED4] bg-[#F2F4EF] px-2.5 py-1 text-[10px] font-semibold" style={mono}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          <span style={{ color: GRAPHITE }}>ACCESS · INSTANT SETUP</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#15191F] sm:text-[1.75rem]">
          Create your Weav account
        </h2>
        <p className="mt-1.5 text-sm text-[#5B5F54]">
          Start wiring Gemini 2.5 models into pipelines in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#15191F]">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              required
              className="w-full rounded-md border border-[#DBDED4] bg-[#F9FAF7] px-4 py-2.5 text-sm text-[#15191F] placeholder-[#9CA093] transition-all focus:border-[#EA5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA5A2B]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#15191F]">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              required
              className="w-full rounded-md border border-[#DBDED4] bg-[#F9FAF7] px-4 py-2.5 text-sm text-[#15191F] placeholder-[#9CA093] transition-all focus:border-[#EA5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA5A2B]/15"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#15191F]">
            Work email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex.smith@company.com"
            required
            className="w-full rounded-md border border-[#DBDED4] bg-[#F9FAF7] px-4 py-2.5 text-sm text-[#15191F] placeholder-[#9CA093] transition-all focus:border-[#EA5A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA5A2B]/15"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-[#EA5A2B] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#D64F22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A2B] focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-70"
        >
          {isLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              Create account
              <ArrowUpRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 text-center">
        <p className="text-xs text-[#5B5F54]">
          Already have an account?{" "}
          <a href="/sign-in" className="font-bold text-[#33608A] hover:text-[#264A6C]">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}