export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-red-light/5 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-green-light/5 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">隱私權政策</h1>
          <p className="mt-3 text-sm text-text-secondary">最後更新：2026 年 6 月</p>
        </header>

        <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-6 backdrop-blur-sm sm:p-8">
          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <p>本系統會依使用者操作，保存必要資料以提供創業點子判定服務。</p>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-white">可能保存的資料包括</h2>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />付款紀錄</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者填寫的六題內容</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />判定結果</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />系統處理紀錄</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者回饋</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />提交時間、完成時間等操作紀錄</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-white">資料用途</h2>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />建立付款與判定紀錄</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />產生本次判定結果</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />處理系統錯誤、重複付款或客服問題</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />改善服務品質與判定流程</li>
              </ul>
            </div>

            <p>本系統不會將使用者填寫內容任意公開作為案例。</p>
            <p>除依法令要求、金流處理、系統維護或必要服務提供外，不會任意出售或提供使用者資料給無關第三方。</p>
            <p>使用者若對資料保存或刪除有疑問，可透過服務頁面提供的聯絡方式聯繫。</p>
            <p>未來若接入正式金流，付款資料可能由第三方金流服務商依其政策處理。</p>
            <p className="text-xs text-white/40 border-t border-white/[0.06] pt-4 mt-4">聯絡方式：本服務正式上線後，將於頁面提供客服信箱。</p>
          </div>
        </section>

        <footer className="mt-12 text-center space-y-3">
          <a href="/" className="inline-block text-sm text-white/40 hover:text-white/60 transition underline underline-offset-2">← 回首頁</a>
          <p className="text-xs text-white/15">AI創業紅綠燈 v0.7-alpha — 僅供參考，請自行驗證市場需求</p>
          <p className="text-xs text-white/30">聯絡信箱：<a href="mailto:service@aistartuplight.com" className="text-white/30 hover:text-white/60 transition">service@aistartuplight.com</a></p>
          <p className="text-xs text-white/30">服務時間：週一至週五 09:00–18:00</p>
        </footer>
      </div>
    </div>
  );
}
