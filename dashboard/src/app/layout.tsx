import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";

export const metadata: Metadata = {
  title: "Mantle Agent Kit — Agentic Wallet Economy",
  description:
    "The first verifiable AI agent wallet economy on Mantle — autonomous, policy-enforced, ERC-8004 identity-native",
  keywords: ["Mantle", "AI agent", "DeFi", "wallet", "MNT", "mETH", "ERC-8004"],
  themeColor: "#08090e",
  openGraph: {
    title: "Mantle Agent Kit",
    description: "Autonomous AI agent wallet on Mantle",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ background: "var(--bg)", overflow: "hidden", height: "100vh" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
