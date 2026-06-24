"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { AnalysisResult } from "@/app/api/analyze-idea/route";
import type { SubmitAnalysisResponse } from "@/app/api/submit-analysis/route";
function isValidAnalysisResult(data: unknown): data is AnalysisResult {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.light === "string" &&
    ["red", "yellow", "green"].includes(d.light) &&
    typeof d.oneLineJudgement === "string" &&
    typeof d.biggestRisk === "string" &&
    typeof d.title === "string" &&
    Array.isArray(d.marketSignals)
  );
}
import SiteHeader from "@/components/site/SiteHeader";
import { PrecheckForm } from "@/components/startup-light/PrecheckForm";
import { PaymentPanel } from "@/components/startup-light/PaymentPanel";
import { PaidQuestionForm } from "@/components/startup-light/PaidQuestionForm";
import { AnalysisMeta, AnswerSummary, AnalysisSuccess, RevisionNotice } from "@/components/startup-light/Results";
import { lightConfig, formatTime } from "@/components/startup-light/ui";
import { FIRST_REPORT_PRICE_TWD } from "@/lib/pricing";

const isBeta = process.env.NEXT_PUBLIC_PUBLIC_BETA === "true";
const betaEndDate = process.env.NEXT_PUBLIC_BETA_END_DATE || null;
function formatBetaEndDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }); }
  catch { return dateStr; }
}

const MIN_LENGTH = 10;
const MAX_LENGTH = 100;

const DEMO_CASES = [
  { title: "全品類 AI 電商平台", light: "red" as const, quadrant: "低需求 × 高疑慮", judgement: "目標使用者、付費者與第一批商家都不明確，但第一版包含平台、會員、金流、物流、客服與後台，交付過重。" },
  { title: "AI 個人化穿搭電商", light: "yellow" as const, quadrant: "高需求 × 高疑慮", judgement: "穿搭與購物決策可能有需求，但第一版若同時包含 AI 推薦、商品資料、庫存、購物車與會員，版本太重。" },
  { title: "AI 商品幸運色推薦", light: "yellow" as const, quadrant: "低需求 × 低疑慮", judgement: "點子有趣且容易做，但需求與付費意願不明，較適合小測，不適合重做。" },
  { title: "銀髮族防滑用品推薦清單", light: "green" as const, quadrant: "高需求 × 低疑慮", judgement: "使用者族群明確，痛點具體，第一版可以用一頁式清單測商品點擊，不需要先做商城。" },
];

type FeedbackValue = "準" | "普通" | "不準";

function safeScrollIntoView(el: HTMLElement | null): void {
  if (!el) return;
  try {
    el.scrollIntoView({ block: "start" });
  } catch {
    el.scrollIntoView(true);
  }
}



const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AI創業紅綠燈",
  url: "https://aistartuplight.com",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "想做 AI 副業、工具或線上服務前，先回答 6 題，取得紅黃綠燈判定、市場跡象與最大風險摘要。用一杯飲料的價格，在開工前買一次冷靜。",
  offers: {
    "@type": "Offer",
    price: 49,
    priceCurrency: "TWD",
  },
};
export default function Home() {
  // Risk scan state
  const [riskForm, setRiskForm] = useState({ idea: "", targetUser: "", problem: "" });
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({});

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string; createdAt: string } | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentFormHtml, setPaymentFormHtml] = useState<string | null>(null);

  // Full assessment state
  const [showFullForm, setShowFullForm] = useState(false);
  const [fullForm, setFullForm] = useState({ idea: "", targetUser: "", problem: "", pricing: "", firstVersion: "", buildTime: "" });
  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState<string | null>(null);

  // Analysis result state
  const [analysisData, setAnalysisData] = useState<SubmitAnalysisResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Feedback state
  const [feedbackSent, setFeedbackSent] = useState<FeedbackValue | null>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const fullFormSectionRef = useRef<HTMLDivElement>(null);
  // URL handoff state (from /payment/result or ReturnURL)
  // Read URL params at init time (SSR-safe)
  const { pid: initialPid, aid: initialAid } = typeof window === "undefined"
    ? { pid: null as string | null, aid: null as string | null }
    : (() => { const p = new URLSearchParams(window.location.search); return { pid: p.get("paymentId"), aid: p.get("analysisId") }; })();
  const [urlHandoffStatus, setUrlHandoffStatus] = useState(initialPid ? "loading" : "none" as "none" | "loading" | "paid" | "pending" | "not_found" | "error");
  const [urlPaymentId] = useState<string | null>(initialPid);
  const [urlAnalysisId, setUrlAnalysisId] = useState<string | null>(initialAid);

  function toggleExample(key: string) {
    setExpandedExamples((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // On mount, check for paymentId / analysisId from URL query params
  useEffect(() => {
    if (!urlPaymentId) return;
    const aid = urlAnalysisId;

    (async () => {
      try {
        const res = await fetch(`/api/payment-status?paymentId=${encodeURIComponent(urlPaymentId)}`);
        if (res.status === 404) {
          setUrlHandoffStatus("not_found");
          return;
        }
        if (!res.ok) {
          setUrlHandoffStatus("error");
          return;
        }
        const data = await res.json();

        if (data.status === "paid") {
          const resolvedAnalysisId = data.analysisId || aid;
          setUrlAnalysisId(resolvedAnalysisId);
          setAnalysisId(resolvedAnalysisId);
          setPaymentData({ id: urlPaymentId, createdAt: data.paidAt || new Date().toISOString() });
          setPaymentConfirmed(true);
          setShowFullForm(true);
          setUrlHandoffStatus("paid");
          setFullError(null);
        } else if (data.status === "pending") {
          setUrlHandoffStatus("pending");
        } else {
          // failed / expired / unknown
          setUrlHandoffStatus("error");
        }
      } catch {
        setUrlHandoffStatus("error");
      }
    })();
  }, [urlPaymentId, urlAnalysisId]);


  // ─── Scroll to result when analysis completes ───
  useEffect(() => {
    if (analysisData?.hasSignal && analysisResult) {
      requestAnimationFrame(() => {
        safeScrollIntoView(resultSectionRef.current);
      });
    }
  }, [analysisData, analysisResult]);

  // --- Scroll to full form when entering assessment phase ---
  useEffect(() => {
    if (showFullForm && (paymentConfirmed || isBeta) && !analysisData) {
      requestAnimationFrame(() => {
        safeScrollIntoView(fullFormSectionRef.current);
      });
    }
  }, [showFullForm, paymentConfirmed, analysisData]);

  function updateRiskField(key: string, value: string) {
    setRiskForm((prev) => ({ ...prev, [key]: value }));
    setBoundaryError(null);
    setShowPayment(false);
    setShowFullForm(false);
    setPaymentData(null);
    setAnalysisId(null);
    setPaymentConfirmed(false);
    setAnalysisData(null);
    setAnalysisResult(null);
    setPaymentFormHtml(null);
    setFullError(null);
  }

  function updateFullField(key: string, value: string) {
    setFullForm((prev) => ({ ...prev, [key]: value }));
    setFullError(null);
    setAnalysisData(null);
    setAnalysisResult(null);
    setBoundaryError(null);
  }

  function handleRiskNext() {
    const v = (s: string) => { const t = s?.trim() ?? ""; return t.length >= MIN_LENGTH && t.length <= MAX_LENGTH; };
    if (!v(riskForm.idea) || !v(riskForm.targetUser) || !v(riskForm.problem)) return;
    // Note: isLikelyNonBiz is removed since validation moved to server side
    setBoundaryError(null);
    // Public Beta: skip payment, go directly to full form
    if (isBeta) {
      setShowFullForm(true);
      setFullForm((prev) => ({ ...prev, idea: riskForm.idea, targetUser: riskForm.targetUser, problem: riskForm.problem }));
      return;
    }
    setShowPayment(true);
  }

  async function handleConfirmPayment() {
    if (!paymentData || paymentConfirmed) return;
    setConfirmLoading(true);
    try {
      const res = await fetch("/api/confirm-payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: paymentData.id }),
      });
      const data = await res.json();
      if (!res.ok) { setFullError(data.error || "付款確認失敗"); return; }
      setPaymentConfirmed(true);
      setShowFullForm(true);
      setFullForm((prev) => ({ ...prev, idea: riskForm.idea, targetUser: riskForm.targetUser, problem: riskForm.problem }));
    } catch {
      setFullError("無法確認付款，請稍後再試。");
    } finally { setConfirmLoading(false); }
  }

  async function handlePaymentClick() {
    if (paymentData) return;
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/create-payment", { method: "POST" });
      const data = await res.json();
      console.log("[page] create-payment response", JSON.stringify({ keys: Object.keys(data), hasFormHtml: !!data.formHtml, formHtmlLength: data.formHtml?.length, paymentStatus: data.payment?.status }));
      if (!res.ok) { setFullError(data.error || "付款建立失敗"); return; }
      setPaymentData(data.payment);
      setAnalysisId(data.analysisId);
      setFullForm((prev) => ({ ...prev, idea: riskForm.idea, targetUser: riskForm.targetUser, problem: riskForm.problem }));
      if (data.formHtml) setPaymentFormHtml(data.formHtml);
    } catch {
      setFullError("無法建立付款，請稍後再試。");
    } finally { setPaymentLoading(false); }
  }

  async function handleFullSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Public Beta: skip paymentData check
    if (!isBeta && !paymentData) { setFullError("請先建立付款。"); return; }
    const allFields = [fullForm.idea, fullForm.targetUser, fullForm.problem, fullForm.pricing, fullForm.firstVersion, fullForm.buildTime];
    if (allFields.some(s => { const t = s?.trim() ?? ""; return t.length < MIN_LENGTH || t.length > MAX_LENGTH; })) {
      setFullError("每題請輸入 10～100 字。"); return;
    }
    setFullLoading(true); setFullError(null); setAnalysisData(null); setAnalysisResult(null);
    try {
      const res = await fetch("/api/submit-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isBeta ? { ...fullForm } : { paymentId: paymentData!.id, analysisId, ...fullForm }),
      });
      const data = await res.json();
      if (data?.status === "duplicate_submission") {
        setFullError(data.message || "本次付款已送出判定，請勿重複提交。");
        setAnalysisData(null);
        return;
      }
      if (!res.ok) { setFullError(data.error || "提交失敗"); return; }
      const result = data as SubmitAnalysisResponse;
      setAnalysisData(result);
      if (result.hasSignal && result.analysisResult && isValidAnalysisResult(result.analysisResult)) {
        setAnalysisResult(result.analysisResult);
      }
    } catch {
      setFullError("無法連接到伺服器，請檢查網路連線。");
    } finally { setFullLoading(false); }
  }

  async function handleFeedback(value: FeedbackValue) {
    setFeedbackSent(value);
    try { await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: value, analysisId: analysisData?.analysisId, paymentId: analysisData?.paymentId }) }); } catch { /* silent */ }
  }

  const allAnswers = [
    { q: "你的點子是什麼？", a: fullForm.idea },
    { q: "目標使用者是誰？", a: fullForm.targetUser },
    { q: "它解決什麼問題？", a: fullForm.problem },
    { q: "你想怎麼收費？", a: fullForm.pricing },
    { q: "第一版你打算怎麼做？", a: fullForm.firstVersion },
    { q: "你預估多久能完成？", a: fullForm.buildTime },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(webAppSchema)}}
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-red-light/5 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-green-light/5 blur-[100px]" />
      </div>
      <SiteHeader />

      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">

        {/* Hero */}
        <header className="mb-16 text-center">
          <div className="mx-auto mb-6 flex h-14 w-28 items-center justify-center">
            <svg viewBox="0 0 160 64" className="h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]" fill="none">
              <rect x="4" y="8" width="152" height="48" rx="20" className="fill-white/8 stroke-white/10" strokeWidth="2" />
              <circle cx="36" cy="32" r="16" className="fill-red-light/30 stroke-red-light/40" strokeWidth="2" />
              <circle cx="80" cy="32" r="16" className="fill-yellow-light/20 stroke-yellow-light/30" strokeWidth="2" />
              <circle cx="124" cy="32" r="16" className="fill-green-light/20 stroke-green-light/30" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl">AI 副業開工前<br />先做一次紅綠燈檢查</h1>
          <p className="mx-auto mb-1 max-w-lg text-lg leading-relaxed text-text-secondary">AI 做得出來，不代表值得投入。</p>
          <p className="mx-auto mb-3 max-w-lg text-lg leading-relaxed text-text-secondary">時間、成本與風險，開工前先停看聽。</p>
          <p className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-text-secondary/70">填完六題，先把你的 AI 工具、網站、App 或服務點子，整理成紅黃綠檢查結果。</p>
          {isBeta
            ? <div style={{display:"none"}} className="inline-flex items-center gap-2 rounded-full border border-blue-light/30 bg-blue-light/10 px-4 py-1.5 text-sm font-medium text-blue-light">限時免費公測中</div>
            : <div style={{display:"none"}} className="inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-medium text-yellow-light">首次檢查 49 元</div>
          }
        </header>

        {/* Suitable / Unsuitable */}
        <section className="mb-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-light/15 bg-green-light/[0.04] p-5">
            <h3 className="mb-2 text-sm font-semibold text-green-light">適合你，如果：</h3>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你正準備做 AI 副業、AI 工具、網站、App 或服務。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你有 2～5 個 AI 點子，不知道哪個該先投入。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你做得出產品，但不確定這是不是值得開工的方向。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你想在投入時間、金錢或開發成本前，先檢查需求、收費、交付與執行疑慮。</li>
            </ul>
          </div>
          <div className="rounded-xl border border-red-light/15 bg-red-light/[0.04] p-5">
            <h3 className="mb-2 text-sm font-semibold text-red-light">不適合你，如果：</h3>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你只是想測 AI 好不好玩，沒有真的準備投入資源。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你要的是完整創業計畫、陪跑、募資簡報或成功保證。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你期待系統直接幫你改點子、給整改方案或幫你做產品。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你想問一般搜尋、數學題、投資預測、即時新聞、聊天、翻譯或作業。</li>
            </ul>
          </div>
        </section>

        {/* Product boundary notice */}
        <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-text-secondary/60">
          本工具只檢查 AI 副業、AI 工具、網站、App、服務或內容產品點子；不處理一般搜尋、數學題、投資預測、即時新聞、聊天、翻譯、作業或非商業問題。
        </div>

        {/* URL Handoff: Loading */}
        {urlHandoffStatus === "loading" && (
          <div className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
            <div className="mb-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
            <h2 className="text-lg font-semibold text-white">正在確認付款狀態</h2>
            <p className="mt-2 text-sm text-text-secondary">請稍候…</p>
          </div>
        )}

        {/* URL Handoff: Pending */}
        {urlHandoffStatus === "pending" && (
          <div className="mb-8 rounded-2xl border border-yellow-light/20 bg-yellow-light/[0.04] p-8 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">處理中</div>
            <h2 className="text-lg font-semibold text-white">付款仍在處理中</h2>
            <p className="mt-2 text-sm text-text-secondary">我們尚未收到付款確認，請稍後重新整理此頁，或返回<a href={`/payment/result?paymentId=${encodeURIComponent(urlPaymentId || "")}${urlAnalysisId ? `&analysisId=${encodeURIComponent(urlAnalysisId)}` : ""}`} className="ml-1 text-yellow-light underline underline-offset-2 hover:text-yellow-light/80">付款結果頁</a>確認狀態。</p>
          </div>
        )}

        {/* URL Handoff: Not found */}
        {urlHandoffStatus === "not_found" && (
          <div className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">找不到付款資訊</h2>
            <p className="mt-2 text-sm text-text-secondary">查無此付款編號，請確認連結是否正確。</p>
          </div>
        )}

        {/* URL Handoff: Error */}
        {urlHandoffStatus === "error" && (
          <div className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">發生錯誤</h2>
            <p className="mt-2 text-sm text-text-secondary">無法確認付款狀態，請稍後再試。若問題持續，請重新建立付款。</p>
          </div>
        )}

                {/* Precheck Form */}
        {!showPayment && !analysisData && urlHandoffStatus === "none" && (
          <PrecheckForm isBeta={isBeta}
            idea={riskForm.idea}
            targetUser={riskForm.targetUser}
            problem={riskForm.problem}
            onChange={updateRiskField}
            onNext={handleRiskNext}
            expandedExamples={expandedExamples}
            onToggleExample={toggleExample}
          />
        )}

        {/* Boundary Error */}
        {boundaryError && !analysisData && (
          <div className="mb-8 rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-sm text-yellow-light">
            {boundaryError.split("\\n").map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
          </div>
        )}

        {/* Payment Panel */}
        <PaymentPanel
          showPayment={showPayment}
          paymentData={paymentData}
          paymentConfirmed={paymentConfirmed}
          paymentLoading={paymentLoading}
          confirmLoading={confirmLoading}
          boundaryError={boundaryError}
          analysisData={analysisData}
          formHtml={paymentFormHtml}
          onPaymentClick={handlePaymentClick}
          onConfirmPayment={handleConfirmPayment}
        />

        {/* Beta mode banner */}
        {isBeta && showFullForm && !analysisData && (
          <section className="mb-8 rounded-2xl border border-blue-light/20 bg-blue-light/[0.04] p-6 backdrop-blur-sm sm:p-8 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-light/30 bg-blue-light/10 px-4 py-1.5 text-sm font-semibold text-blue-light">限時公測</div>
            <p className="text-sm text-text-secondary">目前為限時公測，暫不收費。</p>
            {betaEndDate && <p className="mt-1 text-xs text-text-secondary/60">預計公測至 {formatBetaEndDate(betaEndDate)}</p>}
          </section>
        )}

        <div ref={fullFormSectionRef}>
        {/* Full Assessment Form */}
        {showFullForm && (paymentConfirmed || isBeta) && !analysisData && (
          <PaidQuestionForm
            form={fullForm}
            onChange={updateFullField}
            onSubmit={handleFullSubmit}
            fullLoading={fullLoading}
            expandedExamples={expandedExamples}
            onToggleExample={toggleExample}
          />
        )}
        </div>

        {/* Full Assessment Error */}
        {fullError && !analysisData && (
          <div className="mb-8 rounded-xl border border-red-light/20 bg-red-light/5 px-5 py-4 text-sm text-red-light"><span className="font-semibold">錯誤：</span>{fullError}</div>
        )}

        {/* Result: Rejected */}
        {analysisData && !analysisData.hasSignal && (analysisData.status === "needs_revision" || analysisData.status === "attempts_exhausted" || analysisData.status.startsWith("rejected")) && (
          <section className="mb-12 space-y-5">
            <AnalysisMeta analysisData={analysisData} />
            <div className="rounded-2xl border border-yellow-light/20 bg-yellow-light/[0.04] px-6 py-8 text-center backdrop-blur-sm">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">未產生燈號</div>
              <h2 className="mb-2 text-lg font-bold text-white">本次判定未產生紅黃綠燈</h2>
              <p className="mx-auto max-w-md text-sm text-text-secondary">原因：{analysisData.errorReason || "不明"}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">判定狀態</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-white/60">狀態：</span>
                  <span className="rounded-md border border-yellow-light/20 bg-yellow-light/[0.06] px-2 py-0.5 text-xs font-semibold text-yellow-light">{analysisData.status}</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{analysisData.errorReason}</p>
              </div>
            </div>
            <AnswerSummary answers={allAnswers} />
            <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-center backdrop-blur-sm">
              <p className="text-sm text-text-secondary/60">本次判定未產生紅黃綠燈，暫不提供下載正式判定報告。</p>
            </div>
            {analysisData && (analysisData.status === "needs_revision") && analysisData.remainingAttempts !== undefined && (
              <RevisionNotice
                remainingAttempts={analysisData.remainingAttempts}
                onReset={() => { setAnalysisData(null); setAnalysisResult(null); setFullError(null); }}
              />
            )}
          </section>
        )}

        {/* Result: System Error */}
        {analysisData && analysisData.status === "failed_system_error" && (
          <section className="mb-12 space-y-5">
            <AnalysisMeta analysisData={analysisData} />
            <div className="rounded-2xl border border-red-light/20 bg-red-light/[0.04] px-6 py-8 text-center backdrop-blur-sm">
              <h2 className="mb-2 text-lg font-bold text-white">系統錯誤</h2>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-text-secondary">{analysisData.errorReason || "伺服器暫時無法處理判定，請稍後再試。"}</p>
            </div>
            <div className="rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-sm text-yellow-light">
              <p className="font-semibold">付款保留待處理</p>
              <p className="mt-1 text-xs text-yellow-light/70">此筆款項尚未使用，重新提交時系統會保留付款編號。若問題持續，請截圖此畫面並聯繫客服。</p>
            </div>
            <AnswerSummary answers={allAnswers} />
            <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-center backdrop-blur-sm">
              <p className="text-sm text-text-secondary/60">因系統錯誤未完成判定，不提供下載正式判定報告。</p>
            </div>
          </section>
        )}

       
        <div ref={resultSectionRef}>
        {/* Result: Success */}
        {analysisData && analysisData.hasSignal && analysisResult && (
          <AnalysisSuccess
            analysisData={analysisData}
            analysisResult={analysisResult}
            answers={allAnswers}
            feedbackSent={feedbackSent}
            onFeedback={handleFeedback}
          />
        )}
        </div>

        {/* Demo Cases removed */}

        {/* Footer */}
        <footer className="mt-16 text-center space-y-3">
          <nav className="flex items-center justify-center gap-3 text-xs">
            <a href="/terms" className="text-white/30 hover:text-white/60 transition">服務條款</a>
            <span className="text-white/15">｜</span>
            <a href="/privacy" className="text-white/30 hover:text-white/60 transition">隱私權政策</a>
            <span className="text-white/15">｜</span>
            <a href="/refund" className="text-white/30 hover:text-white/60 transition">退款政策</a>
          </nav>
          <p className="text-xs text-white/15">AI創業紅綠燈 v0.19-alpha — 僅供參考，請自行驗證市場需求</p>
          <p className="text-xs text-white/30">聯絡信箱：<a href="mailto:service@aistartuplight.com" className="text-white/30 hover:text-white/60 transition">service@aistartuplight.com</a></p>
          <p className="text-xs text-white/30">服務時間：週一至週五 09:00–18:00</p>
        </footer>
      </div>
    </div>
  );
}


