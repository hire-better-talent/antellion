import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "AI Employer Visibility | See How AI Describes Your Company to Candidates | Antellion",
  description:
    "Candidates ask ChatGPT, Claude, and Gemini where to work. Antellion runs 100 queries the way your candidates do and shows you what AI says about your company. Get a Visibility Snapshot: your mention rate, ranked competitor comparison, and citation gap analysis. Free. 48 hours.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo-mark.svg",
  },
  openGraph: {
    title: "What does AI tell candidates about your company?",
    description:
      "100 candidate-intent queries. 10 employer reputation themes. Ranked competitor comparison. Antellion shows you where you appear, where competitors appear instead, and which citation sources are shaping the answer. Free Visibility Snapshot in 48 hours.",
    type: "website",
    siteName: "Antellion",
  },
  twitter: {
    card: "summary_large_image",
    title: "What does AI tell candidates about your company?",
    description:
      "100 candidate-intent queries. Ranked competitor comparison. Citation gap analysis. See what AI tells candidates about your company vs. your competitors. Free Visibility Snapshot in 48 hours.",
  },
  metadataBase: new URL("https://antellion.com"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen flex-col">
          {/* ── Sticky glassmorphism nav ─────────────────────────── */}
          <header className="glass-nav sticky top-0 z-50 border-b border-white/5">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
              <Link href="/" aria-label="Antellion home">
                <img
                  src="/logo-horizontal-light.svg"
                  alt="Antellion"
                  className="h-16"
                />
              </Link>
              <a
                href="#lead-form"
                className="btn-gradient btn-glow rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all"
              >
                Get My Snapshot
              </a>
            </div>
          </header>

          {/* ── Main content ─────────────────────────────────────── */}
          <main className="flex-1 bg-white">{children}</main>

          {/* ── Footer ───────────────────────────────────────────── */}
          <footer className="bg-[#0B0F14] text-gray-400">
            <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-md">
                  <img
                    src="/logo-horizontal-light.svg"
                    alt="Antellion"
                    className="mb-4 h-10 opacity-70"
                  />
                  <p className="text-sm leading-relaxed text-gray-400">
                    Antellion is an AI employer visibility platform. We help
                    companies understand and improve how they appear in AI when
                    candidates decide where to work.
                  </p>
                </div>

                <div className="flex flex-col gap-3 text-sm">
                  <a
                    href="mailto:hello@antellion.com"
                    className="text-gray-300 transition-colors hover:text-white"
                  >
                    hello@antellion.com
                  </a>
                  <a
                    href="mailto:hello@antellion.com?subject=Privacy%20Policy"
                    className="text-gray-500 transition-colors hover:text-gray-300"
                  >
                    Privacy inquiries
                  </a>
                </div>
              </div>

              <div className="mt-12 border-t border-gray-800 pt-8">
                <div className="flex flex-col gap-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    &copy; {new Date().getFullYear()} Antellion. All rights
                    reserved.
                  </p>
                  <p>
                    Your data is used only to produce your Visibility Snapshot. We
                    do not sell, share, or distribute your information.
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
