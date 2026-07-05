import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "第一次該先試哪一個 AI？ChatGPT、Claude、Gemini、DeepSeek、Grok 選擇工具",
  description:
    "第一次開始用 AI，不知道該先試 ChatGPT、Claude、Gemini、DeepSeek 還是 Grok？回答幾個問題，找到適合你的第一個 AI 起步方向。",
  openGraph: {
    title: "第一次該先試哪一個 AI？ChatGPT、Claude、Gemini、DeepSeek、Grok 選擇工具",
    description:
      "第一次開始用 AI，不知道該先試 ChatGPT、Claude、Gemini、DeepSeek 還是 Grok？回答幾個問題，找到適合你的第一個 AI 起步方向。",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
