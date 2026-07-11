import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 創業卡在哪裡？需求、付費、產品、成本、獲客還是下一步決策",
  description:
    "AI 讓產品更容易做出來，但不會自動解決需求、付費、交付與獲客問題。先確認你卡在哪一類問題，再去找對應解答。",
  openGraph: {
    title: "AI 創業卡在哪裡？需求、付費、產品、成本、獲客還是下一步決策",
    description:
      "AI 讓產品更容易做出來，但不會自動解決需求、付費、交付與獲客問題。先確認你卡在哪一類問題，再去找對應解答。",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
