"use client";

import { useState, useEffect } from "react";
const categories = [
  {
    id: "demand",
    title: "需求驗證",
    question: "這是不是一個真實、持續而且有人在意的問題？",
    questions: [
      {
        question: "怎麼知道這個 AI 點子是真的有人需要？",
        answer: "先不看這個點子聽起來酷不酷，先看有沒有人正在為這個問題付出代價。如果對方現在已經在花時間、花錢，或一直忍受麻煩處理它，才比較像真需求。\n\n比起問「你覺得這個點子怎麼樣」，更有用的是問：你現在怎麼處理？多久會遇到一次？最麻煩的是哪一步？\n\n如果問題會反覆出現，而且不是只有一個人有，才值得往下驗證。",
      },
      {
        question: "朋友都說不錯，這算需求嗎？",
        answer: "通常不算。朋友說不錯，很多時候只是禮貌性地鼓勵你的想法，不代表他真的有這個問題。\n\n需求不是「聽起來合理」，而是「對方現在真的常遇到，而且有痛感」。如果他自己不是這類使用者，或沒有真的卡在這件事上，那句不錯的參考價值很有限。\n\n你可以把朋友的反應當成鼓勵，但不要把它當成需求成立的證據。",
      },
      {
        question: "我該先做產品，還是先找人聊？",
        answer: "先找人聊，通常比先做產品更划算。因為你現在最需要確認的，不是你做不做得出來，而是這個問題值不值得解。\n\n一開始不用聊很多人，但至少要接觸幾個可能真的會遇到這個問題的人。先弄清楚他們現在怎麼處理、最痛的是哪裡，再決定要不要做第一版。\n\n太早做產品，很容易做成你以為有用、但對方其實不在意的東西。",
      },
      {
        question: "驗證多久沒結果，就該先停？",
        answer: "沒有固定天數，但如果你已經聊了一輪人，還是找不到明確重複出現的問題，就不要急著繼續做。重點不是你花了多久，而是你有沒有看到穩定訊號。\n\n所謂穩定訊號，是指：不同人講出相似困擾，而且這個困擾不是可有可無的小麻煩。\n\n如果你一直只能得到「好像還行」、「有空再看看」這種反應，通常代表還不到該做產品的時候。這時先停，不是放棄，而是避免你太早投入。",
      },
    ],
  },
  {
    id: "willingness-to-pay",
    title: "付費意願",
    question: "有人說想用，和有人願意付錢，中間差了什麼？",
    questions: [
      { question: "有人說需要，怎麼知道他會不會付錢？", answer: "看他過去有沒有為類似問題付過錢。如果對方從來沒為這類事情花過錢，說需要多半是禮貌。\n\n更有用的是觀察他目前的替代方案：他現在用什麼？免費的、將就的，還是根本沒在處理？如果他已經在為別的解法付錢，或願意花時間忍受麻煩，那他的需要才比較靠近真實。直接問「你現在花多少錢在這個問題上」，比問「你覺得怎麼樣」有用很多。" },
      { question: "免費試用很多人，用來判斷付費意願可靠嗎？", answer: "不太可靠。免費使用者和付費使用者的行為差很大——免費的門檻是零，很多人點進來只是好奇，不是真的有需求。\n\n真正的付費意願，通常要等到使用者必須做「掏錢或離開」的選擇時才會浮現。如果你有免費階段，不要只看註冊數，要看有多少人願意主動回來、有多少人因為不能用而抱怨。那些抱怨的人，才比較接近會付錢的人。" },
      { question: "還沒做完產品，可以先測願不願意付費嗎？", answer: "可以，但方式不是叫人預購。比較可行的做法是：先用一頁說明你的解法大概長怎樣、預計收多少錢，然後看有沒有人願意留下 email。關鍵不是你做得多漂亮，而是對方在資訊還不完整時，願不願意承諾下一步。如果連留下聯絡方式都不願意，就太早期待付費。\n\n另一種方式是直接問：「如果現在有一個版本可以幫你解決這個問題，你願意一個月付多少？」不要問「你願不願意」，要問「多少錢你會猶豫」。" },
      { question: "對方說「有做出來我會買」，這算承諾嗎？", answer: "不算。這句話的意思是「我現在對你沒有承諾，但我也不討厭你」。對方說這句話的時候，通常沒有真的想像過掏錢的場景。\n\n真實的付費意願，發生在對方願意為了你的產品改變既有行為、或放棄另一個替代方案。與其把這句話當成信號，不如進一步問：「那你現在用什麼方法處理這個問題？如果改用我的，你覺得哪些事會變好？」如果對方答不出來，那句「我會買」就只是禮貌。" },
    ],
  },
  {
    id: "product-value",
    title: "產品價值",
    question: "AI 真正讓事情更好，還是只是多了一層麻煩？",
    questions: [
      { question: "我的 AI 工具跟 ChatGPT 很像，還有做的價值嗎？", answer: "如果你的產品只是「用 ChatGPT 做一個介面」，那市場上已經有太多選擇。做的價值來自你能不能讓使用者在某個具體場景中，省掉好幾步操作。不是 AI 多厲害，而是你的流程幫他省了多少時間。\n\n如果使用者打開 ChatGPT 也能做到差不多的事，你的包裝就不夠厚。反過來說，如果你能讓他少讀三篇文章、少填五個欄位、少切兩個工具，他才會覺得你的東西比通用模型值得留下。" },
      { question: "只是把幾個 AI 功能整合起來，算產品嗎？", answer: "算，但要看整合帶來的價值是不是大於分開用。如果使用者也能自己開三個視窗手動做完，你的整合就還不夠。\n\n真正的產品感來自：使用者不用思考下一步。把選項變少、把操作變直覺、把流程串成一個閉環——這些是產品工作，不是 AI 工作。所以關鍵不是用不用 AI，而是你的使用者體驗有沒有比「自己來」更好。" },
      { question: "使用者說方便，但沒有明顯效果，這樣夠嗎？", answer: "不太夠。方便是起步門檻，不是留存理由。如果使用者說方便但沒有持續在用，代表你的產品對他來說可有可無——想到時用一下，忘了也不會痛。\n\n真正有價值的產品，會讓使用者在沒有它的時候感到不方便。你可以回頭看：使用者回來的原因是什麼？是習慣了，還是真的卡在某件事上，只有你的工具能幫他解決？如果是前者，那方便還撐不久。" },
      { question: "怎麼判斷我解決的是痛點，還是只是小麻煩？", answer: "看使用者為了解決這個問題願意付出多少代價。如果是痛點，他會主動找解法、願意換工具、願意付錢、會抱怨你還沒做好。如果是小麻煩，他會說「這個不錯耶」然後繼續用原本的方式。\n\n另一個判斷方式：把 AI 拿掉，你的產品還有人要用嗎？如果沒有 AI 這件事，你的價值就不存在，那你解決的很可能只是「少了 AI 很不方便」這個偽需求。產品價值不該建立在 AI 的有無上，而是建立在問題本身值不值得解。" },
    ],
  },
  {
    id: "cost-delivery",
    title: "成本與交付",
    question: "一個人能不能穩定交付，而不是做完後成本失控？",
    questions: [
      { question: "一個人做 AI 產品，最容易低估哪些成本？", answer: "客服和上下文切換的成本通常被低估最多。你覺得產品很直覺，但使用者不會這樣覺得——他們會問你重複的問題、回報邊界狀況、要求你解釋為什麼有時候不準。這些聽起來很小，但每天十則訊息累積下來，你的開發時間就沒了。\n\n另一個被低估的是維護：API 會改版、模型會更新、資料庫會滿、憑證會過期。一個人能做的事就那麼多，把維護時間算進去之後，真正花在功能上的時間會比你以為的少很多。" },
      { question: "我可以先用 API 和現成工具做，還是一定要自己開發？", answer: "先用 API 和現成工具做，完全沒問題。創業初期，速度比擁有權重要。你不需要自己訓練模型、自己架伺服器——那些是後期才需要考慮的事情。\n\n先證明有人要用、有人願意付錢，再來決定哪些部分需要自己掌握。比較危險的情況是：因為現成工具有限制，你就花好幾個禮拜去自己造輪子，結果市場根本不在乎你用什麼技術。先用最快的路徑上線，如果活下來再慢慢換。" },
      { question: "怎麼估算每多一個使用者，我會多花多少錢？", answer: "把成本拆成三塊：API 呼叫費、儲存與頻寬、客服時間。API 費用通常最好估——看一下每次對話或每次處理花多少 token，乘上使用次數。\n\n客服時間比較難量化，但可以先抓一個大概：每 100 個活躍使用者，你可能每天會花 30 到 60 分鐘在回覆上。如果這三塊加起來隨著使用者成長線性上升，你要確認收費能不能 cover 住。如果不行，就代表你目前的單位經濟還沒站穩。" },
      { question: "還不能穩定交付前，可以先開始收費嗎？", answer: "可以，但要講清楚。如果你還在打磨階段，收費不是為了賺錢，而是為了過濾使用者——願意付錢的人通常比較認真、願意給回饋，也比較能接受初期不完美。\n\n重點是你收費的對象要理解這是早期版本，而且你要有能力回應他們的問題。不要一口氣收很多人，而是在可控範圍內慢慢放。收費不是承諾完美，而是承諾回應。" },
    ],
  },
  {
    id: "first-users",
    title: "第一批使用者",
    question: "沒有粉絲、預算或大量人脈，要怎麼接觸第一批人？",
    questions: [
      { question: "第一批使用者到底要去哪裡找？", answer: "去你的目標使用者本來就會出現的地方。不是去創業社群找，而是去他們解決問題的現場。如果你的產品是幫設計師整理素材，就去設計師的社團、Discord、工作坊。如果你是幫小店家管庫存，就去店家老闆會逛的論壇或 LINE 群。\n\n關鍵不是人夠多，而是那些人剛好都有同一個困擾。比較常見的錯誤是：去一個很多人但跟你產品無關的地方貼連結，然後納悶為什麼沒人點。" },
      { question: "沒有粉絲、沒有人脈，也能找到第一批使用者嗎？", answer: "可以，但方式不是用流量，而是用精準度。沒有人脈的時候，你能做的就是一個一個找、一個一個聊。這很慢，但很有效。\n\n你可以去對方會出沒的地方，先看他們在抱怨什麼，然後提供幫助——不是推銷，是幫他解決一個小問題。如果他覺得有用，他就會成為你的第一批使用者。與其花時間想怎麼讓一千人看到，不如先讓一個人覺得你的東西真的有用。" },
      { question: "怎麼分辨對方是願意幫忙，還是真的會持續使用？", answer: "看他有沒有為了你的產品改變行為。願意幫忙的人會給你鼓勵、說加油、不錯喔，但之後不會再打開你的產品。真正會持續使用的人，會抱怨——抱怨哪裡不夠順、抱怨某個功能還沒有、抱怨為什麼慢了。\n\n抱怨是比稱讚更強的留存訊號。另一個訊號：他有沒有主動把你的產品放進他的工作流程？如果他只是偶爾打開看一下，那就還不是穩定使用者。" },
      { question: "第一批使用者很少，是產品有問題還是找人方式有問題？", answer: "都有可能，但比較常見的原因是找人方式有問題。如果你是去不對的地方推廣，來的人本來就不會是你的目標使用者，當然留不住。\n\n先確認你有沒有精準去到對方所在的地方，有沒有用對方能理解的語言在描述問題。如果找人的路徑是對的，但來的少數人都說「好像不太有用」，那才是產品有問題。不要先急著改產品，先確認你找的是對的人。" },
    ],
  },
  {
    id: "decide",
    title: "繼續、調整或停",
    question: "證據不足時，該補驗證、換方向，還是先不要做？",
    questions: [
      { question: "做了一陣子沒成長，什麼情況該繼續？", answer: "當你還持續從使用者身上學到新東西的時候，即使數字沒長，也值得繼續。成長停滯有時候是因為你觸及了第一批願意忍耐的早期使用者，但還沒找到接觸下一批人的方法。\n\n如果你做的調整有讓留存變好、或讓使用者抱怨的方向更明確，那就代表你還在進步。真正該思考調整或停的訊號是：不管你怎麼改，使用者反應都一樣冷淡，而且你也說不出下一步該驗證什麼。" },
      { question: "使用者有在用，但人數很少，該改還是該撐？", answer: "先確認這些人為什麼留下來。如果少數留下來的人都很喜歡、很依賴，那你的產品方向可能是對的，只是觸及不夠廣。這時候該做的不是大改方向，而是找到更多類似的人。\n\n反過來說，如果留下的人只是「還可以用」，沒有很喜歡、也沒有抱怨，那你的產品大概還不夠好。這時可以考慮改：不是改方向，而是把你的強項再做深一點，讓留下來的人變得更依賴。" },
      { question: "數據和使用者回饋互相矛盾時，該相信哪一個？", answer: "先看你的數據夠不夠大。如果數據來自少數樣本，使用者的回饋可能比數據更接近真實。但如果數據來自幾百個使用者，而回饋只有兩三個人在說，優先看數據。\n\n另一種常見的矛盾：數據說使用者在用，但沒有人願意付錢。這通常代表你的產品有價值但不夠不可取代——使用者喜歡，但還沒喜歡到願意掏錢。這種情況要解的課題不是產品方向，而是商業模式或定價。" },
      { question: "什麼時候該停止這個點子，不要再投入？", answer: "當你已經沒有新的假設可以驗證的時候。意思是：你試了幾種方向，使用者反應都冷淡，而且你也說不出「下一件值得試的事是什麼」。另一個訊號是：你發現這個問題並沒有你想像中那麼多人有，或者有這個問題的人並沒有積極在找解法。\n\n停下來不是失敗，而是把時間留給更值得驗證的點子。比較危險的是一直撐著不認，因為捨不得已經投入的時間。但已經投入的時間是沉沒成本，它不該影響你接下來要不要繼續。" },
    ],
  },
];

const situps = [
  "我不知道這個點子有沒有人需要",
  "有人說不錯，但我不知道他會不會付錢",
  "我做得出來，但不確定 AI 有沒有真的創造價值",
  "我怕 API、客服、維護成本拖垮自己",
  "我不知道第一批使用者在哪裡",
  "已經花了很多時間，不知道該繼續還是暫停",
];

export default function AiStartupQuestionsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeIndex = expandedId
    ? categories.findIndex((c) => c.id === expandedId)
    : -1;
  const expandedRow = activeIndex >= 0 ? Math.floor(activeIndex / 2) : -1;

  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);

  // Reset question-level expansion when switching to a different category
  useEffect(() => {
    setExpandedQuestionIdx(null);
  }, [expandedId]);

  const cardBtn = (cat: (typeof categories)[0]) => {
    const isActive = expandedId === cat.id;
    const num = categories.indexOf(cat) + 1;
    return (
      <button
        key={cat.id}
        onClick={() => setExpandedId(isActive ? null : cat.id)}
        aria-expanded={isActive}
        className={`w-full rounded-xl border p-5 text-left transition ${
          isActive
            ? "border-green-light/40 bg-white/[0.07]"
            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
        }`}
      >
        <h3 className="mb-2 text-base font-semibold text-white">
          <span className="mr-1 text-base font-semibold text-white">{String(num).padStart(2, '0')}.</span>
          {cat.title}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {cat.question}
        </p>
      </button>
    );
  };


  const qaCard = expandedId ? (
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-6">
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-green-light/60">
        {String(activeIndex + 1).padStart(2, "0")}. {categories[activeIndex].title}
      </div>
      <h3 className="mb-4 text-lg font-semibold text-white">
        {String(activeIndex + 1).padStart(2, "0")}. {categories[activeIndex].title}的 4 個問題
      </h3>
      <ul className="space-y-3">
        {(categories[activeIndex].questions as { question: string; answer: string }[]).map((q, i) => {
          const isOpen = expandedQuestionIdx === i;
          return (
            <li key={i} className="overflow-hidden">
              <button
                onClick={() => setExpandedQuestionIdx(isOpen ? null : i)}
                className="flex w-full items-start gap-3 text-left text-sm leading-relaxed text-text-secondary hover:text-white transition-colors"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs text-white/50">
                  {i + 1}
                </span>
                {q.question}
              </button>
              {isOpen && (
                <div className="mt-3 pl-8 space-y-2 text-sm leading-relaxed text-white/80">
                  {q.answer.split("\n\n").map((p, pi) => (
                    <p key={pi}>{p}</p>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-bg-primary">

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

          {/* B. 六類總覽卡片 */}
          <h2 className="mb-5 text-xl font-semibold text-white">
            你可能卡在哪一類？
          </h2>
          <div className="flex flex-col gap-4">

            {/* No expansion: show all 3 rows */}
            {expandedRow === -1 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {categories.slice(0, 2).map(cardBtn)}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {categories.slice(2, 4).map(cardBtn)}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {categories.slice(4, 6).map(cardBtn)}
                </div>
              </>
            )}

            {/* expandedRow === 0: clicked row 0 (cards 1-2) → QA below */}
            {expandedRow === 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {categories.slice(0, 2).map(cardBtn)}
                </div>
                {qaCard}
              </>
            )}

            {/* expandedRow === 1: clicked row 1 (cards 3-4) → QA below */}
            {expandedRow === 1 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {categories.slice(2, 4).map(cardBtn)}
                </div>
                {qaCard}
              </>
            )}

            {/* expandedRow === 2: QA → clicked row 3 (cards 5-6) below */}
            {expandedRow === 2 && (
              <>
                {qaCard}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {categories.slice(4, 6).map(cardBtn)}
                </div>
              </>
            )}

          </div>

          {/* C. 你現在卡在哪裡？對照區塊 */}
          <h2 className="mt-12 mb-5 text-xl font-semibold text-white">
            你現在卡在哪裡？
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {situps.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <p className="text-sm leading-relaxed text-red-light">
                  {s}
                </p>
              </div>
            ))}
          </div>
          {/* D. 低壓 CTA */}
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <p className="mb-3 text-lg leading-relaxed text-white">
              你是不是卡住了？
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
