"use client";

import { Show, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useSessions } from "@/lib/use-sessions";
import { formatTime } from "@/lib/timer-engine";
import { Mail, Calendar, Clock, Target } from "react-feather";

export default function ProfilePage() {
  const { user } = useUser();
  const { sessions, hydrated } = useSessions();

  const totalSessions = hydrated ? sessions.length : 0;
  const totalFocusMs = hydrated
    ? sessions.reduce((sum, s) => sum + s.totalFocusTime, 0)
    : 0;

  return (
    <main className="mx-auto w-[90%] max-w-3xl py-12 pb-20">
      <h1 className="text-3xl font-bold sm:text-4xl">Profile</h1>

      <Show when="signed-in">
        <div className="mt-8 animate-fade-in-up rounded-2xl border border-[#30363d] bg-[#161b22] p-6 sm:p-8">
          <div className="flex items-center gap-5">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full border-2 border-[#30363d] sm:h-20 sm:w-20"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                {user?.fullName || user?.username || "Your Account"}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#8b949e]">
                <Mail className="size-4" />
                {user?.primaryEmailAddress?.emailAddress ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-1.5 text-sm text-[#6e7681]">
            <Calendar className="size-4" />
            Member since{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={<Target className="size-5 text-[#2f81f7]" />}
            label="Total Sessions"
            value={hydrated ? String(totalSessions) : "—"}
          />
          <StatCard
            icon={<Clock className="size-5 text-[#3fb950]" />}
            label="Total Focus Time"
            value={hydrated ? formatTime(totalFocusMs) : "—"}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[#30363d] bg-[#161b22] p-5">
          <p className="text-sm text-[#8b949e]">
            Your focus sessions are stored locally in this browser. Sign in to
            sync your data across devices in a future update.
          </p>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="mt-8 animate-fade-in-up rounded-2xl border border-dashed border-[#30363d] bg-[#161b22]/50 p-12 text-center">
          <h2 className="mt-4 text-xl font-bold text-[#e6edf3]">
            You&apos;re not signed in
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#8b949e]">
            Sign in or create an account to personalize your experience. Your
            timer works anonymously either way.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <SignInButton mode="modal">
              <button className="rounded-xl border border-[#30363d] px-5 py-2.5 text-sm font-semibold text-[#e6edf3] transition-colors hover:border-[#2f81f7]">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-xl bg-[#2f81f7] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f6feb]">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </div>
      </Show>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#30363d] bg-[#161b22] px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2128]">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-[#6e7681]">{label}</div>
      </div>
    </div>
  );
}
