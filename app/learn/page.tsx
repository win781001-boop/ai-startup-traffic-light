import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI創業小學堂｜AI 副業、一人公司與開工前風險檢查",
  description:
    "整理 AI 副業、AI 被動收入、一人公司、OPC、AI Agent 與 MVP 市場驗證觀念。AI 做得出來，不代表值得投入；開始前先看懂風險。",
  openGraph: {
    title: "AI創業小學堂｜AI 副業、一人公司與開工前風險檢查",
    description:
      "整理 AI 副業、AI 被動收入、一人公司、OPC、AI Agent 與 MVP 市場驗證觀念。AI 做得出來，不代表值得投入；開始前先看懂風險。",
  },
};

const articles = [
  {
    title: "一人公司 OPC 是什麼？AI 時代的 One Person Company 與超級個體",
    url: "/one-person-company-opc",
    description:
      "說明 OPC、一人公司、超級個體與 AI 時代個人創業的關係",
    tags: ["OPC", "一人公司", "超級個體"],
  },
  {
    title: "AI 被動收入是真的嗎？開始前先看懂風險",
    url: "/learn/ai-passive-income",
    description:
      "說明 AI 被動收入常見誤區、AI 副業風險、自動化與市場需求的差異",
    tags: ["AI 被動收入", "AI 副業", "市場驗證"],
  },
];

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          AI創業小學堂
        </h1>
        <p className="mb-10 max-w-lg text-lg leading-relaxed text-text-secondary">
          整理 AI 副業、一人公司、AI Agent、MVP 與市場驗證觀念。AI 做得出來，不代表值得投入；開始前先看懂時間、成本與風險。
        </p>

        <div className="space-y-6">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              className="block rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
            >
              <h2 className="mb-2 text-xl font-semibold text-white">
                {article.title}
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-text-secondary">
                {article.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, j) => (
                  <span
                    key={j}
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
          <p className="mb-4 text-lg leading-relaxed text-white">
            有 AI 副業或工具想法？開始前，先用 <strong>AI創業紅綠燈</strong> 做一次 6 題檢查。
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
  );
}
