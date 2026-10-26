import Hero from "@/components/hero";
import Timer from "@/components/timer/timer";
import SessionList from "@/components/session-list";

export default function Home() {
  return (
    <main className="min-h-screen pb-20">
      <Hero />
      <Timer />
      <SessionList />
    </main>
  );
}
