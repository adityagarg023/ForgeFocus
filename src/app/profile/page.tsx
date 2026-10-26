"use client";

import { Show, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useSessions } from "@/lib/use-sessions";
import { formatTime } from "@/lib/timer-engine";
import { Mail, Calendar, Clock, Target } from "react-feather";

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFocusDuration(milliseconds: number): string {
  const minutes = Math.round(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function ConsistencyChart({
  sessions,
  hydrated,
}: {
  sessions: { completedAt: number; totalFocusTime: number }[];
  hydrated: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 364 * DAY_MS);
  // Start on Sunday so each column is a calendar week.
  start.setDate(start.getDate() - start.getDay());

  const focusByDay = new Map<string, number>();
  for (const session of sessions) {
    const key = localDateKey(new Date(session.completedAt));
    focusByDay.set(key, (focusByDay.get(key) ?? 0) + session.totalFocusTime);
  }

  const days: Date[] = [];
  for (let date = new Date(start); date <= today; date = new Date(date.getTime() + DAY_MS)) {
    days.push(date);
  }

  const activeDays = days.filter(
    (date) => date <= today && (focusByDay.get(localDateKey(date)) ?? 0) > 0,
  ).length;

  let currentStreak = 0;
  for (let date = new Date(today); ; date.setDate(date.getDate() - 1)) {
    if ((focusByDay.get(localDateKey(date)) ?? 0) <= 0) {
      if (localDateKey(date) === localDateKey(today)) continue;
      break;
    }
    currentStreak += 1;
  }

  const monthLabels: { label: string; column: number }[] = [];
  let previousMonth = -1;
  days.forEach((date, index) => {
    const column = Math.floor(index / 7);
    if (date.getMonth() !== previousMonth && date.getDate() <= 7) {
      monthLabels.push({
        label: date.toLocaleDateString(undefined, { month: "short" }),
        column,
      });
      previousMonth = date.getMonth();
    }
  });

  function levelFor(milliseconds: number): number {
    if (milliseconds <= 0) return 0;
    if (milliseconds < 30 * 60_000) return 1;
    if (milliseconds < 60 * 60_000) return 2;
    if (milliseconds < 120 * 60_000) return 3;
    return 4;
  }

  const levelClasses = [
    "bg-[#21262d]",
    "bg-[#0e4429]",
    "bg-[#006d32]",
    "bg-[#26a641]",
    "bg-[#39d353]",
  ];

  return (
    <section className="mt-6 rounded-2xl border border-[#30363d] bg-[#161b22] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#e6edf3]">Focus consistency</h2>
          <p className="mt-1 text-sm text-[#8b949e]">Your last 365 days of deep work</p>
        </div>
        <div className="flex gap-4 text-sm text-[#8b949e]">
          <span><strong className="text-[#e6edf3]">{hydrated ? activeDays : "—"}</strong> active days</span>
          <span><strong className="text-[#e6edf3]">{hydrated ? currentStreak : "—"}</strong> day streak</span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="min-w-[660px]">
          <div
            className="mb-2 grid text-[10px] text-[#8b949e]"
            style={{ gridTemplateColumns: `repeat(${Math.ceil(days.length / 7)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: Math.ceil(days.length / 7) }, (_, column) => {
              const month = monthLabels.find((item) => item.column === column);
              return <span key={column} className="h-4">{month?.label ?? ""}</span>;
            })}
          </div>
          <div className="flex gap-[3px]">
            {Array.from({ length: Math.ceil(days.length / 7) }, (_, column) => (
              <div key={column} className="flex flex-1 flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, weekday) => {
                  const date = days[column * 7 + weekday];
                  if (!date || date > today) return <span key={weekday} className="h-[11px] w-[11px]" />;
                  const key = localDateKey(date);
                  const focusMs = focusByDay.get(key) ?? 0;
                  const level = levelFor(focusMs);
                  const dateLabel = date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <span
                      key={weekday}
                      title={`${dateLabel}: ${focusMs > 0 ? formatFocusDuration(focusMs) + " focused" : "No focus sessions"}`}
                      aria-label={`${dateLabel}: ${focusMs > 0 ? formatFocusDuration(focusMs) + " focused" : "No focus sessions"}`}
                      className={`h-[11px] w-[11px] rounded-[2px] ${levelClasses[level]}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8b949e]">
        <span>Each square represents one day. More focus time means a brighter square.</span>
        <div className="flex items-center gap-1.5" aria-label="Focus time legend">
          <span>Less</span>
          {levelClasses.map((className, index) => (
            <span key={index} className={`h-[11px] w-[11px] rounded-[2px] ${className}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { user } = useUser();
  const { sessions, hydrated } = useSessions();

  const totalSessions = hydrated ? sessions.length : 0;
  const totalFocusMs = hydrated
    ? sessions.reduce((sum, session) => sum + session.totalFocusTime, 0)
    : 0;

  return (
    <main className="mx-auto w-[90%] max-w-4xl py-12 pb-20">
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

        <ConsistencyChart sessions={sessions} hydrated={hydrated} />

        <div className="mt-6 rounded-2xl border border-[#30363d] bg-[#161b22] p-5">
          <p className="text-sm text-[#8b949e]">
            Your focus sessions are synced to your account and available
            across devices. Anonymous sessions stay in this browser only.
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
