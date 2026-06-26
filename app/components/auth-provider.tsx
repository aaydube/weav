"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ClerkProvider, UserButton as ClerkUserButton, SignIn as ClerkSignIn, SignUp as ClerkSignUp, useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/nextjs";

// Check if Clerk is configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
    // Read auth status from localStorage
    const savedAuth = localStorage.getItem("py_auth_user");
    if (savedAuth) {
      try {
        const u = JSON.parse(savedAuth);
        setUser(u);
        setIsSignedIn(true);
      } catch (e) {
        localStorage.removeItem("py_auth_user");
      }
    }
    setIsLoaded(true);
  }, []);

  // Simple route guard simulation
  useEffect(() => {
    if (!isLoaded) return;
    const publicPaths = ["/sign-in", "/sign-up", "/"];
    const isPublicPath = publicPaths.includes(pathname);
    if (!isSignedIn && !isPublicPath) {
      router.push("/sign-in");
    } else if (isSignedIn && isPublicPath && pathname !== "/") {
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
    // Set a cookie for middleware
    document.cookie = `py_auth_token=${mockUser.id}; path=/`;
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
    document.cookie = `py_auth_token=${mockUser.id}; path=/`;
    setUser(mockUser);
    setIsSignedIn(true);
    router.push("/dashboard");
  };

  const signOut = () => {
    localStorage.removeItem("py_auth_user");
    // Clear cookie
    document.cookie = "py_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
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
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      >
        <img
          src={user.imageUrl}
          alt={user.fullName}
          className="h-9 w-9 rounded-full border border-zinc-200 bg-white p-0.5 hover:opacity-90 dark:border-zinc-800"
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-zinc-200 bg-white p-2 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 z-50">
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900 mb-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{user.fullName}</p>
              <p className="text-xs text-zinc-500 truncate dark:text-zinc-400">{user.emailAddress}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            >
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
  const router = useRouter();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    signIn(email);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Sign in to Py</h2>
        <p className="text-sm text-zinc-500 mt-2 dark:text-zinc-400">Welcome back! Please enter your details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@galaxy.ai"
            required
            className="mt-1 block w-full px-4 py-2 border border-zinc-300 rounded-lg text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 block w-full px-4 py-2 border border-zinc-300 rounded-lg text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors cursor-pointer"
        >
          Sign In as Demo User
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Don't have an account?{" "}
          <a href="/sign-up" className="font-semibold text-violet-600 hover:text-violet-500">
            Sign up
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) return;
    signUp(email, firstName, lastName);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Create your account</h2>
        <p className="text-sm text-zinc-500 mt-2 dark:text-zinc-400">Start building your automated LLM workflows.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              required
              className="mt-1 block w-full px-4 py-2 border border-zinc-300 rounded-lg text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              required
              className="mt-1 block w-full px-4 py-2 border border-zinc-300 rounded-lg text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex.smith@example.com"
            required
            className="mt-1 block w-full px-4 py-2 border border-zinc-300 rounded-lg text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors cursor-pointer"
        >
          Sign Up & Get Started
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <a href="/sign-in" className="font-semibold text-violet-600 hover:text-violet-500">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
