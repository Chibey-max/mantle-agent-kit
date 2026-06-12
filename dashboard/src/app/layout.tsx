import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { Navbar } from "@/components/shared/Navbar";

export const metadata: Metadata = {
  title: "Mantle Agent Kit — Agentic Wallet Economy",
  description:
    "The first verifiable AI agent wallet economy on Mantle — autonomous, policy-enforced, ERC-8004 identity-native",
  keywords: ["Mantle", "AI agent", "DeFi", "wallet", "MNT", "mETH", "ERC-8004"],
  themeColor: "#0a0a10",
  openGraph: {
    title: "Mantle Agent Kit",
    description: "Autonomous AI agent wallet on Mantle",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className="min-h-screen font-sans antialiased"
        style={{ background: "var(--color-bg)" }}
      >
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 pt-14">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
