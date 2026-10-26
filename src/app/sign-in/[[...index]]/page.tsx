import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <SignIn />
    </main>
  );
}
