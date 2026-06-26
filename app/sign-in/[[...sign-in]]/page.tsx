"use client";

import { Layers } from "lucide-react";
import { SignIn } from "../../components/auth-provider";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-600/10">
          <Layers className="h-5.5 w-5.5" />
        </div>
        <span className="text-2xl font-bold text-zinc-900">
          Py
        </span>
      </div>
      <SignIn />
    </div>
  );
}
