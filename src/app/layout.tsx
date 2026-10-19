import Header from "../components/Layout/header";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeFocus",
  description: "Helps you do deep work"
  
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <div>
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
