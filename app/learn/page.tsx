import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AI創業小學堂｜AI 副業、一人公司與開工前風險檢查",
  description:
    "整理 AI 副業、AI 工具、一人公司、OPC、AI Agent、MVP 與市場驗證觀念。AI 做得出來，不代表值得投入；開始前先看懂風險。",
  openGraph: {
    title: "AI創業小學堂｜AI 副業、一人公司與開工前風險檢查",
    description:
      "整理 AI 副業、AI 工具、一人公司、OPC、AI Agent、MVP 與市場驗證觀念。AI 做得出來，不代表值得投入；開始前先看懂風險。",
  },
};

const articles = [
  {
    title: "AI 創業 QA",
    url: "/learn/ai-startup-questions",
    description:
      "先確認你卡在需求、付費、產品、成本、第一批使用者，還是下一步決策。",
    tags: ["創業 QA", "問題定位"],
  },
  {
    title: "一人公司 OPC 是什麼？AI 時代的 One Person Company 與超級個體",
    url: "/one-person-company-opc",
    description:
      "理解 OPC、一人公司、超級個體與 AI 時代個人創業的關係。",
    tags: ["OPC", "一人公司", "超級個體"],
  },
  {
    title: "AI 副業不該先開工：開工前先回答 6 個問題",
    url: "/learn/ai-side-project",
    description:
      "想用 AI 做副業或工具前，先確認市場、付費意願、MVP、獲客與時間成本。",
    tags: ["AI 副業", "MVP", "市場驗證"],
  },
  {
    title: "AI 被動收入是真的嗎？解構個人被動收入的真實面目",
    url: "/learn/ai-passive-income",
    description:
      "解析 AI 個人被動收入的紋路、常見誤區與實踐策略，看清什麼是真的、什麼只是行銷噱頭。",
    tags: ["AI 被動收入", "個人創業", "實踐策略"],
  },
];

const upcoming = [
  "AI Agent 可以創業嗎？",
  "怎麼知道有人願意付費？",
  "MVP 切多大才對？",
];

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-bg-primary">

    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          AI創業小學堂
        </h1>
        <p className="mb-6 text-lg leading-relaxed text-text-secondary">
          給想做 AI 副業、AI 工具、一人公司與 AI Agent 的人，在開工前先看懂市場、付費意願、MVP、時間成本與風險。
        </p>

        {/* 定位說明 */}
        <div className="mb-10 rounded-xl border border-white/10 bg-white/5 px-6 py-5">
          <p className="text-sm leading-relaxed text-text-secondary">
            這裡不是 AI 工具清單，也不是教你快速賺錢。AI創業小學堂整理的是開工前該先想清楚的事：你的點子沒有市場、使用者沒有付費意願、MVP 能不能切小、時間成本值不值得。
          </p>
        </div>

        {/* 文章列表 */}
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

        {/* 即將整理 */}
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
            即將整理
          </h2>
          <ul className="space-y-2">
            {upcoming.map((item, i) => (
              <li key={i} className="text-sm text-text-secondary/60">
                {item}
              </li>
            ))}
          </ul>
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
      </div>
  );
}
