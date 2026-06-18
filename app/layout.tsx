import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI創業紅綠燈｜副業開工前冷靜檢查工具",
  description:
    "想做 AI 副業、工具或線上服務前，先回答 6 題，取得紅黃綠燈判定、市場跡象與最大風險摘要。用一杯飲料的價格，在開工前買一次冷靜。",
  metadataBase: new URL("https://aistartuplight.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI創業紅綠燈｜副業開工前冷靜檢查工具",
    description:
      "想做 AI 副業、工具或線上服務前，先回答 6 題，取得紅黃綠燈判定、市場跡象與最大風險摘要。用一杯飲料的價格，在開工前買一次冷靜。",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI創業紅綠燈｜副業開工前冷靜檢查工具",
    description:
      "想做 AI 副業、工具或線上服務前，先回答 6 題，取得紅黃綠燈判定、市場跡象與最大風險摘要。用一杯飲料的價格，在開工前買一次冷靜。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
