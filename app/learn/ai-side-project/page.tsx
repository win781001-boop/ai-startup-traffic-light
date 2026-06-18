import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 副業不該先開工：開工前先回答 6 個問題｜AI創業小學堂",
  description:
    "想做 AI 副業或 AI 工具，別只問能不能做。開始前先檢查目標使用者、付費意願、MVP、獲客來源與時間成本。AI 做得出來，不代表值得投入。",
  openGraph: {
    title: "AI 副業不該先開工：開工前先回答 6 個問題｜AI創業小學堂",
    description:
      "想做 AI 副業或 AI 工具，別只問能不能做。開始前先檢查目標使用者、付費意願、MVP、獲客來源與時間成本。AI 做得出來，不代表值得投入。",
  },
};

export default function AiSideProjectPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-2xl">
        <p className="mb-2 text-sm text-text-secondary">
          AI創業小學堂 · 副業開工前檢查
        </p>
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          AI 副業不該先開工：開工前先回答 6 個問題
        </h1>

        <section className="space-y-5 leading-relaxed text-text-secondary">
          <h2 className="mt-10 text-xl font-semibold text-white">
            為什麼 AI 副業讓人想立刻開工？
          </h2>
          <p>
            2025 年的 AI 工具已經強到讓一個人能在一個周末產出產品原型。Cursor、Bolt.new、Claude、ChatGPT——這些工具讓「做一個 AI 工具」這件事的門檫降到史無前侎的低。想做副業的人，越來越容易說服自己「先開工再說」。
          </p>
          <p>
            但這正是問題所在。AI 讓開工變快，也讓錯誤決策變快。以前花三個月才發現的坑，現在三週就踩進去了。真正麻煩的不是做不出來，而是做完才發現沒人要。
          </p>

          {/* Threads-ready section */}
          <div className="my-6 border-l-2 border-yellow-light/40 py-2 pl-4 text-sm italic text-text-secondary/80">
            很多 AI 副業不是死在技術，而是死在「根本沒人想買」。你以為是在開發產品，其實是在開發自己的幻想。
          </div>

          <h2 className="mt-10 text-xl font-semibold text-white">
            AI 副業不是不能做，而是不能跳過判斷
          </h2>
          <p>
            做 AI 副業沒有錯，錯的是跳過市場判斷直接開工。針對想用 AI 做副業或工具的人，開工前先回答六個問題。不是為了讓你不做，而是為了讓你不白做。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            問題一：你要解決的是誰的問題？
          </h2>
          <p>
            最常見的 AI 副業起點是「我想做一個 XX 工具」。但想做工具和有人需要這個工具是兩回事。如果你無法用一句話說清楚「誰在痛、痛在哪裡」，那你還不應該開工。
          </p>
          <p>
            不要問「你會買嗎」，要問「你上次遇到這個問題時，怎麼解決的？」。問真實行為，不要問意願。
          </p>

          {/* Threads-ready section */}
          <div className="my-6 border-l-2 border-yellow-light/40 py-2 pl-4 text-sm italic text-text-secondary/80">
            不要問朋友「這個工具很酷吧？」。朋友會說「很酷」。然後你花兩個月做完，發現他根本不會付錢。把朋友的稱讚當成市場驗證，是最貴的副業錯誤。
          </div>

          <h2 className="mt-10 text-xl font-semibold text-white">
            問題二：這個問題現在有人在花錢或花時間處理嗎？
          </h2>
          <p>
            如果沒有人目前在用任何方式解決這個問題——即使是用 Excel、Google 表單、手動處理——代表這個問題可能沒有人覺得它是問題。市場驗證的第一步不是問「有沒有人想要」，而是「有沒有人已經在花上費用解決它」。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            問題三：使用者真的有付費意願，還是只是覺得很酷？
          </h2>
          <p>
            免費使用者和付費使用者是兩種生物。有人登入、有人留 email、有人說「好想要」——這些都不算。只有當有人按下「付費」按鈕時，才算數。
          </p>
          <p>
            想知道有沒有付費意願，在開工前就可以測試：做一個 landing page，看多少人愿意預購或留下 email。如果 10 個人裡有 3 個以上說會付錢，你可以繼續下去。如果沒有，不要再花更多時間。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            問題四：MVP 能不能切到兩週內做出來？
          </h2>
          <p>
            如果你的 MVP 需要超過兩週，代表切太大了。一人公司的資源極有限，不要想一次做一個平台。切到最小可交付的版本，兩週內能上線的那種。如果兩週生不出來，代表你切太大了。
          </p>
          <p>
            MVP 的目的不是「做一個完整的產品」，而是「用最小成本驗證有沒有人愿意付費」。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            問題五：你有沒有明確的第一批使用者來源？
          </h2>
          <p>
            AI 副業最常見的死法是「做完才想怎麼獲客」。在開工前就應該知道第一批使用者在哪裡。他們是 PTT 板上的人？是 Facebook 社群裡的人？是 Threads 上跟踪你的人？如果你無法指出你要去哪裡找使用者，代表你還不應該開工。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            問題六：時間成本算清楚了嗎？
          </h2>
          <p>
            開發只占 30% 的工作，剩下的 70% 是行銷、客服、營運、修改。AI 可以幫你節省開發時間，但不能節省策略和決策的時間。如果三個月內無法產生營收，你的現金流撐得住嗎？
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            結論：AI 讓開工變快，也讓錯誤決策變快
          </h2>
          <p>
            AI 副業不是不能做。但開工前先回答六個問題，比先寫程式重要得多。不是為了讓你不做，而是為了讓你不白做。
          </p>
          <p>
            <strong>AI 做得出來，不代表值得投入。</strong>
          </p>
        </section>

        {/* CTA */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
          <p className="mb-4 text-lg leading-relaxed text-white">
            如果你已經有一個 AI 副業、AI 工具或一人公司想法，開始前可以先用 <strong>AI創業紅綠燈</strong> 做一次 6 題檢查。
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-green-light px-8 py-3 text-base font-semibold text-bg-primary transition hover:bg-green-light/90"
          >
            做一次紅綠燈檢查
          </a>
        </div>
      </article>
    </main>
  );
}
