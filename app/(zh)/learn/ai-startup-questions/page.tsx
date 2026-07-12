import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";

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

const categories = [
  { id: "demand", title: "需求驗證", question: "這是不是一個真實、持續而且有人在意的問題？", href: "/learn/ai-side-project", linkLabel: "查看相關問題" },
  { id: "willingness-to-pay", title: "付費意願", question: "有人說想用，和有人願意付錢，中間差了什麼？", href: "/learn/ai-side-project", linkLabel: "查看相關問題" },
  { id: "product-value", title: "產品價值", question: "AI 真正讓事情更好，還是只是多了一層麻煩？", href: "/learn/ai-passive-income", linkLabel: "查看相關問題" },
  { id: "cost-delivery", title: "成本與交付", question: "一個人能不能穩定交付，而不是做完後成本失控？", href: "/one-person-company-opc", linkLabel: "查看相關問題" },
  { id: "first-users", title: "第一批使用者", question: "沒有粉絲、預算或大量人脈，要怎麼接觸第一批人？", href: "/learn/ai-side-project", linkLabel: "查看相關問題" },
  { id: "decide", title: "繼續、調整或停", question: "證據不足時，該補驗證、換方向，還是先不要做？", href: "/one-person-company-opc", linkLabel: "查看相關問題" },
];

const situps = [
  { text: "我不知道這個點子有沒有人需要", target: "需求驗證", href: "/learn/ai-side-project" },
  { text: "有人說不錯，但我不知道他會不會付錢", target: "付費意願", href: "/learn/ai-side-project" },
  { text: "我做得出來，但不確定 AI 有沒有真的創造價值", target: "產品價值", href: "/learn/ai-passive-income" },
  { text: "我怕 API、客服、維護成本拖垮自己", target: "成本與交付", href: "/one-person-company-opc" },
  { text: "我不知道第一批使用者在哪裡", target: "第一批使用者", href: "/learn/ai-side-project" },
  { text: "我已經做了一段時間，不知道該繼續、調整還是停", target: "繼續、調整或停", href: "/one-person-company-opc" },
];

export default function AiStartupQuestionsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <SiteHeader />
      <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl">

          {/* A. Hero */}
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI 創業卡在哪裡？
          </h1>
          <p className="mb-2 text-lg leading-relaxed text-white/90">
            先確認你現在要解的是需求、付費、產品、成本、獲客，還是下一步決策
          </p>
          <div className="mb-10 rounded-xl border border-white/10 bg-white/5 px-6 py-5">
            <p className="text-sm leading-relaxed text-text-secondary">
              AI 讓產品更容易做出來，但不會自動解決需求、付費、交付與獲客問題。很多 AI 創業卡住，是因為把不同問題混在一起處理。先確認卡在哪一類，再去看對應問題與做下一步判斷。
            </p>
          </div>

          {/* B. 六類問題卡片 */}
          <h2 className="mb-5 text-xl font-semibold text-white">
            你可能卡在哪一類？
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
              >
                <h3 className="mb-2 text-base font-semibold text-white">
                  {cat.title}
                </h3>
                <p className="mb-3 text-sm leading-relaxed text-text-secondary">
                  {cat.question}
                </p>
                <a
                  href={cat.href}
                  className="inline-flex items-center gap-1 text-sm text-green-light/80 hover:text-green-light transition-colors"
                >
                  {cat.linkLabel}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            ))}
          </div>

          {/* C. 你現在卡在哪裡？對照區塊 */}
          <h2 className="mt-12 mb-5 text-xl font-semibold text-white">
            你現在卡在哪裡？
          </h2>
          <div className="space-y-3">
            {situps.map((s, i) => (
              <a
                key={i}
                href={s.href}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-white/20 hover:bg-white/10 group"
              >
                <div>
                  <p className="text-sm leading-relaxed text-white/90">
                    {s.text}
                  </p>
                  <p className="mt-1 text-xs text-green-light/70">
                    → {s.target}
                  </p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>

          {/* D. 低壓 CTA */}
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <p className="mb-3 text-lg leading-relaxed text-white">
              已經有具體點子嗎？
            </p>
            <p className="mb-5 text-sm leading-relaxed text-text-secondary">
              把目標使用者、他正在面對的問題與你的想法整理清楚，再做一次開工前檢查。
            </p>
            <a
              href="/"
              className="inline-block rounded-lg bg-green-light px-8 py-3 text-base font-semibold text-bg-primary transition hover:bg-green-light/90"
            >
              開始紅綠燈檢查
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
