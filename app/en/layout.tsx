import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EnFooter } from "@/components/en/startup-light/EnFooter";
import { EnHeader } from "@/components/en/layout/EnHeader";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Startup Traffic Light | Idea Check Before You Build",
  description:
    "A lightweight English preview for pressure-testing an AI tool, micro-SaaS, or side-project idea before you build.",
  openGraph: {
    title: "AI Startup Traffic Light",
    description:
      "Pressure-test an AI tool, micro-SaaS, or side-project idea before you spend weeks building it.",
    url: "/en",
    type: "website",
  },
};

export default function EnLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-bg-primary text-white">
        <EnHeader />
        {children}
        <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
          <EnFooter />
        </div>
      </body>
    </html>
  );
}
