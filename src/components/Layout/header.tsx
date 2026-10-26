"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="bg-[#010409] h-[10vh] min-h-16 w-full pl-6 pr-6 flex items-center text-white justify-between sm:pl-10 sm:pr-20">
      <Link href="/" className="text-3xl font-bold sm:text-5xl">
        ForgeFocus
      </Link>
      <nav className="flex items-center gap-4 sm:gap-10">
        <Link href="/history" className="text-lg sm:text-2xl">
          History
        </Link>
        <Link href="/profile" className="text-lg sm:text-2xl">
          Profile
        </Link>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-lg border border-[#30363d] px-4 py-1.5 text-sm font-semibold text-[#8b949e] transition-colors hover:border-[#2f81f7] hover:text-[#e6edf3] sm:text-base">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-lg bg-[#2f81f7] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f6feb] sm:text-base">
              Sign up
            </button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>
      </nav>
    </header>
  );
}
