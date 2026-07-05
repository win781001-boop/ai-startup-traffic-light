export default function RefundPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-red-light/5 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-green-light/5 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">退款政策</h1>
          <p className="mt-3 text-sm text-text-secondary">最後更新：2026 年 6 月</p>
        </header>

        <section className="rounded-xl border border-border-subtle bg-bg-card/60 p-6 backdrop-blur-sm sm:p-8">
          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <p>本系統為一次性線上創業點子判定服務。使用者付款並送出表單後，系統即開始處理本次判定。</p>
            <p>判定完成後，除系統錯誤、重複扣款、付款成功但服務未提供，或依法應退款之情形外，原則上不提供退款。</p>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-white">不提供退款的常見情況</h2>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者主觀認為結果不符合期待</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者認為判定不準</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者填寫內容不足</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者填寫錯誤</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者輸入非商業題目</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />使用者亂填或輸入與本系統目的無關的內容</li>
              </ul>
            </div>

            <p>若系統要求補充內容，代表本次輸入資訊不足，並非系統錯誤。此情況會提供本次付款可用的修改次數，不視為退款事由。</p>
            <p>若因系統錯誤導致本次判定未能完成，將保留本次付款資格，或依實際情況協助處理退款。</p>
            <p>若發生重複扣款，使用者可聯繫客服協助確認與處理。</p>
            <p>退款作業時間與方式將依實際金流服務商規定辦理。</p>
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
