import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SharkNinja India — Review Sentiment",
  description:
    "Amazon.in customer review sentiment for SharkNinja India listings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-silver-light bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-bold tracking-tight">
                SharkNinja India
              </span>
              <span className="text-[13px] text-ink-60">Review Sentiment</span>
            </Link>
            <nav className="flex items-center gap-5 text-[13px]">
              <Link href="/" className="text-ink-60 hover:text-ink">
                Dashboard
              </Link>
              <Link href="/upload" className="text-ink-60 hover:text-ink">
                Import data
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
