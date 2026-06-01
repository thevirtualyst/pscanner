import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import SessionProviderWrapper from "./providers/session-provider-wrapper";
import LayoutHeader from "./providers/layout-header";
import LayoutFooter from "./providers/layout-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pscanner — Retail Product Scanner",
  description: "Instant product information for retail customers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProviderWrapper>
          <LayoutHeader />
          <main>{children}</main>
          <LayoutFooter />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
