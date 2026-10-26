import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-[#010409] h-[10vh] min-h-16 w-full pl-6 pr-6 flex items-center text-white justify-between sm:pl-10 sm:pr-20">
      <Link href="/" className="text-3xl font-bold sm:text-5xl">
        ForgeFocus
      </Link>
      <nav className="flex gap-6 sm:gap-10">
        <Link href="/history" className="text-lg sm:text-2xl">
          History
        </Link>
        <Link href="/profile" className="text-lg sm:text-2xl">
          Profile
        </Link>
      </nav>
    </header>
  );
}
