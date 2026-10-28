import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Layout/header";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeFocus — Deep Work Tracker",
  description:
    "Plan focus sessions, track actual working time, and review your productivity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </head>
        <body>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
