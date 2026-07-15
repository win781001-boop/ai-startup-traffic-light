export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-red-light/5 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-green-light/5 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">服務條款</h1>
          <p className="mt-3 text-sm text-text-secondary">最後更新：2026 年 6 月</p>
        </header>

        <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-6 backdrop-blur-sm sm:p-8">
          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <p>本服務為「創業點子判定系統」（以下稱「本系統」）。使用者填寫創業或副業相關點子後，系統會依填寫內容產生紅燈、黃燈或綠燈之初步判定結果。</p>
            <p>判定結果僅供使用者作為初步參考，不構成投資、法律、財務、醫療或其他專業建議。使用者應自行判斷與決策。</p>
            <p>本系統不保證創業成功、營收成果、投資報酬、市場反應或任何特定結果。</p>
            <p>使用者應自行確認填寫內容是否完整、真實、合法。若輸入內容過少、亂填、非商業題目或與本服務目的無關，系統可能無法產生正式紅黃綠結果，並可能要求補充或修改。</p>
            <p>本系統不接受非法、詐欺、灰色產業、侵害他人權利或其他高風險用途。</p>
            <p>使用者仍需自行承擔後續商業決策與執行風險。</p>
            <p>本系統可能依實際營運狀況調整內容、價格或功能，不另個別通知。</p>
            <p className="text-xs text-white/40 border-t border-white/[0.06] pt-4 mt-4">聯絡方式：service@aistartuplight.com</p>
          </div>
        </section>

        <footer className="mt-12 text-center space-y-3">
          <a href="/" className="inline-block text-sm text-white/40 hover:text-white/60 transition underline underline-offset-2">← 回首頁</a>
          <p className="text-xs text-white/15">AI創業紅綠燈 — 僅供參考，請自行驗證市場需求</p>
          <p className="text-xs text-white/30">聯絡信箱：<a href="mailto:service@aistartuplight.com" className="text-white/30 hover:text-white/60 transition">service@aistartuplight.com</a></p>
          <p className="text-xs text-white/30">服務時間：週一至週五 09:00–18:00</p>
        </footer>
      </div>
    </div>
  );
}
