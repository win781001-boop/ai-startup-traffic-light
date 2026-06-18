import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 被動收入是真的嗎？開始前先看懂風險｜AI創業小學堂",
  description:
    "AI 被動收入不等於自動賺錢。開始 AI 副業、一人公司或 AI Agent 專案前，先看懂市場需求、付費意願、MVP 與時間成本風險。",
  openGraph: {
    title: "AI 被動收入是真的嗎？開始前先看懂風險｜AI創業小學堂",
    description:
      "AI 被動收入不等於自動賺錢。開始 AI 副業、一人公司或 AI Agent 專案前，先看懂市場需求、付費意願、MVP 與時間成本風險。",
  },
};

export default function AiPassiveIncomePage() {
  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          AI 被動收入是真的嗎？開始前先看懂風險
        </h1>

        <section className="space-y-5 leading-relaxed text-text-secondary">
          <h2 className="mt-10 text-xl font-semibold text-white">
            AI 被動收入為什麼會吸引人？
          </h2>
          <p>
            近兩年來，「AI 被動收入」這個名詞在社群上越來越常見。有人說用 ChatGPT 写文章放在 Medium 就能賺廣告費，有人說用 AI 生成影片放在 YouTube 就能有被動收入，更有人說用 AI Agent 自動化販賣就能睡着賺。
          </p>
          <p>
            為什麼這個概念讓人如此興奮？因為人人都想要「睡着也有收入」的生活。AI 讓這個夢想看起來比以前更近了——你不再需要一個團隊，不再需要大量資金，一個人就能做出一個產品。但問題不是「做不做得出來」，而是「做出來有沒有人要」。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            常見誤區一：把自動化當成收入
          </h2>
          <p>
            很多人誤以為「自動化 = 被動收入」。你可以用 AI Agent 自動發布社群帖文、自動回覆客服信箱、自動產生內容——但這些都只是「執行自動化」，不是「收入自動化」。如果沒有人對你的產品或內容有需求，自動化只是讓你更快地做一件沒人要的事。
          </p>
          <p>
            自動化降低的是「執行成本」，不是「市場風險」。你仍然需要確認有人愿意為你的產品付費，這一點 AI 不能替你解決。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            常見誤區二：以為工具做出來就有人買
          </h2>
          <p>
            AI 讓開發速度大幅提升，但市場需求沒有因為 AI 而變多。做一個 AI 副業最常見的情況是：花兩週產出 MVP，上線後發現沒有人愿意付費。
          </p>
          <p>
            會讓你賺錢的不是「用 AI 写程式很快」，而是「你解決的問題偏好有人愿意付費」。產品能不能賺錢，與你用什麼工具寫的沒有關係，與市場有沒有需求才有關係。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            常見誤區三：把 AI Agent 當成市場驗證
          </h2>
          <p>
            有人說「我用 AI Agent 自動去粉絲群推廣，就能知道有沒有人想要」。但 AI Agent 可以幫你執行熱度測試、粉絲群接觸，卻不能替代「問對人」這件事。一個人為你的產品留下 email，不等於他會付錢。問對人按下付費按鈕，才算數。
          </p>
          <p>
            AI Agent 是一個很強大的「執行助手」，但他不能替你做「策略決策」。今天網路上真正賺到錢的 OPC（One Person Company）和超級個體，每一個都是先用自己的判斷确認市場需求，然後才讓 AI Agent 去執行。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            開始前要先問的 6 個問題
          </h2>
          <p>
            不管你想做的是 AI 被動收入、AI 副業、AI 一人公司，還是個人創業，在付出時間和成本之前，先問自己這六個問題：
          </p>
          <ul className="list-inside list-disc space-y-1 pl-4">
            <li>你的點子到底是什麼？</li>
            <li>目標使用者是誰？</li>
            <li>它解決什麼問題？</li>
            <li>你打算怎麼收費？（使用者願意付錢嗎？）</li>
            <li>第一版你打算怎麼做？（MVP 範圍）</li>
            <li>你預估多久能完成？（時間成本）</li>
          </ul>
          <p>
            這六個問題看起來簡單，但大部分人在開工前沒有真正回答過。特別是「付費意願」這一項——免費使用者跟付費使用者是兩種生物，AI 不能幫你變出付費意願。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            真正務實的做法：先用 AI 降低試錯成本
          </h2>
          <p>
            不是不要做，而是要用正確的方式做。真正務實的做法是：先用 AI 降低試錯成本，再用小型 MVP 驗證需求。
          </p>
          <p>
            你可以用 Cursor 或 Bolt.new 在一個周末做出產品原型，然後先拿去給目標用戶看，問他們愿不愿意付費。如果 10 個人裡有 3 個以上說會付錢，那你就可以繼續下去。如果沒有，不要再花更多時間精燥它——轉向下一個點子。
          </p>

          <h2 className="mt-10 text-xl font-semibold text-white">
            結論：AI 做得出來，不代表值得投入
          </h2>
          <p>
            AI 被動收入不一定是假的，但它不是「用 AI 自動發布就能賺錢」這麼簡單。真正能賺到錢的 AI 一人公司、OPC、超級個體，都是先用市場驗證確認有人愿意付賺，然後才用 AI 加速執行。
          </p>
          <p>
            AI 做得出來，不代表值得投入。人人都能用 AI 做產品的時代，你的競爭優勢不是「會用 AI」，而是「懂市場」。
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
