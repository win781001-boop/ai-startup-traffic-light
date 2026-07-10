import type { Metadata } from "next";

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
  return children;
}
