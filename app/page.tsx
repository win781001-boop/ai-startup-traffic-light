"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/app/api/analyze-idea/route";
import type { SubmitAnalysisResponse } from "@/app/api/submit-analysis/route";

const DEMO_CASES = [
  { title: "全品類 AI 電商平台", light: "red" as const, quadrant: "低需求 × 慢交付", judgement: "目標使用者、付費者與第一批商家都不明確，但第一版包含平台、會員、金流、物流、客服與後台，交付過重。" },
  { title: "AI 個人化穿搭電商", light: "yellow" as const, quadrant: "高需求 × 慢交付", judgement: "穿搭與購物決策可能有需求，但第一版若同時包含 AI 推薦、商品資料、庫存、購物車與會員，版本太重。" },
  { title: "AI 商品幸運色推薦", light: "yellow" as const, quadrant: "低需求 × 快交付", judgement: "點子有趣且容易做，但需求與付費意願不明，較適合小測，不適合重做。" },
  { title: "銀髮族防滑用品推薦清單", light: "green" as const, quadrant: "高需求 × 快交付", judgement: "使用者族群明確，痛點具體，第一版可以用一頁式清單測商品點擊，不需要先做商城。" },
];

type FeedbackValue = "準" | "普通" | "不準";

// 明顯非商業點子關鍵字（寬鬆檢查）
const NON_BIZ_KEYWORDS = [
  "圓周率", "天氣", "翻譯", "情書", "笑話", "作文", "作業",
  "數學", "股價", "股票", "新聞", "八卦", "食譜推薦", "純聊天",
  "盜版", "破解", "違法", "危險",
];

// 商業點子語境指示詞
const BIZ_CONTEXT_INDICATORS = [
  "我想做", "想做", "想要做", "打算做",
  "網站", "App", "工具", "服務", "平台", "產品",
  "副業", "創業", "收費", "客戶", "使用者", "用戶",
];

function hasBizContext(text: string): boolean {
  return BIZ_CONTEXT_INDICATORS.some((indicator) => text.includes(indicator));
}

function isLikelyNonBiz(text: string): boolean {
  if (text.length < 8 && /^(幫我|請你|可以幫我|告訴我)/.test(text)) return true;
  if (hasBizContext(text)) return false;
  return NON_BIZ_KEYWORDS.some((kw) => text.includes(kw));
}

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, string> = {
  submitted: "已提交",
  completed: "已完成",
  rejected_invalid_idea: "非商業點子",
  rejected_low_information: "資訊不足",
  rejected_unsupported: "不支援的內容",
  failed_system_error: "系統錯誤",
};

const lightConfig: Record<string, { label: string; dot: string; css: string; border: string }> = {
  red: { label: "紅燈", dot: "bg-red-light", css: "bg-red-light/15 text-red-light border-red-light/30 glow-red", border: "border-red-light/20" },
  yellow: { label: "黃燈", dot: "bg-yellow-light", css: "bg-yellow-light/15 text-yellow-light border-yellow-light/30 glow-yellow", border: "border-yellow-light/20" },
  green: { label: "綠燈", dot: "bg-green-light", css: "bg-green-light/15 text-green-light border-green-light/30 glow-green", border: "border-green-light/20" },
};

export default function Home() {
  // Risk scan state
  const [riskForm, setRiskForm] = useState({ idea: "", targetUser: "", problem: "" });
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string; createdAt: string } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  function updateRiskField(key: string, value: string) {
    setRiskForm((prev) => ({ ...prev, [key]: value }));
    setBoundaryError(null);
    setShowPayment(false);
    setShowFullForm(false);
    setPaymentData(null);
    setAnalysisData(null);
    setAnalysisResult(null);
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
    if (!riskForm.idea?.trim() || !riskForm.targetUser?.trim() || !riskForm.problem?.trim()) return;

    const combined = `${riskForm.idea} ${riskForm.targetUser} ${riskForm.problem}`;
    if (isLikelyNonBiz(combined)) {
      setBoundaryError("這個工具只判定創業、副業、產品或商業點子。\n你目前填的內容不像是一個可判定的商業點子，所以暫時不會進入完整判定。\n請改成描述一個你想做的產品、服務、內容、網站、App 或副業構想。");
      return;
    }

    setBoundaryError(null);
    setShowPayment(true);
  }

  async function handlePaymentClick() {
    if (paymentData) return;
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/create-payment", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setFullError(data.error || "付款建立失敗"); return; }
      setPaymentData(data.payment);
      setShowFullForm(true);
      setFullForm((prev) => ({ ...prev, idea: riskForm.idea, targetUser: riskForm.targetUser, problem: riskForm.problem }));
    } catch {
      setFullError("無法建立付款，請稍後再試。");
    } finally { setPaymentLoading(false); }
  }

  async function handleFullSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentData) { setFullError("請先建立付款。"); return; }
    setFullLoading(true); setFullError(null); setAnalysisData(null); setAnalysisResult(null);
    try {
      const res = await fetch("/api/submit-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: paymentData.id, ...fullForm }),
      });
      const data = await res.json();
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

  function handleDownloadReport() {
    if (!analysisResult || !analysisData) return;
    const L = (lightConfig[analysisResult.light] || lightConfig.red).label;
    const qa = [
      ["你的點子是什麼？", fullForm.idea],
      ["目標使用者是誰？", fullForm.targetUser],
      ["它解決什麼問題？", fullForm.problem],
      ["你想怎麼收費？", fullForm.pricing],
      ["第一版你打算怎麼做？", fullForm.firstVersion],
      ["你預估多久能完成？", fullForm.buildTime],
    ];
    let a = "";
    for (let i = 0; i < qa.length; i++) {
      a += "<div class=answer-item><div class=q>" + (i + 1) + ". " + qa[i][0] + "</div><div class=a>" + qa[i][1] + "</div></div>";
    }
    let s = "";
    if (analysisResult.marketSignals && analysisResult.marketSignals.length > 0) {
      s = "<div class=card><h3>根據填寫內容推估的市場跡象</h3><ul class=signals>";
      for (const m of analysisResult.marketSignals) { s += "<li>" + m + "</li>"; }
      s += "</ul></div>";
    }
    let sm = "";
    if (analysisResult.quadrantSummary) {
      sm = "<div class=card><h3>判定摘要</h3><p class=summary>" + analysisResult.quadrantSummary.summary + "</p></div>";
    }
    const css =
      "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}" +
      "body{font-family:-apple-system,\"Noto Sans TC\",\"PingFang TC\",system-ui,sans-serif;background:#f5f5f5;color:#1a1a1a;padding:32px 16px}" +
      ".container{max-width:780px;margin:0 auto}" +
      ".header h1{font-size:22px;font-weight:700;margin-bottom:12px}" +
      ".header .meta{font-size:13px;color:#666;line-height:1.7}" +
      ".light-card{text-align:center;padding:32px 20px;border-radius:12px;border:1.5px solid #ddd;margin-bottom:20px}" +
      ".light-dot{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:8px;vertical-align:middle}" +
      ".light-label{font-size:16px;font-weight:700;vertical-align:middle}" +
      ".light-red .light-dot{background:#c0392b}" +
      ".light-red .light-label{color:#c0392b}" +
      ".light-yellow .light-dot{background:#b8860b}" +
      ".light-yellow .light-label{color:#b8860b}" +
      ".light-green .light-dot{background:#1a7a42}" +
      ".light-green .light-label{color:#1a7a42}" +
      ".light-card h2{font-size:18px;margin-top:8px;color:#1a1a1a}" +
      ".light-card p{font-size:14px;margin-top:6px;color:#444}" +
      ".card{background:white;border-radius:10px;border:1px solid #e0e0e0;padding:20px;margin-bottom:16px}" +
      ".card h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:12px}" +
      ".answer-item{padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;line-height:1.5}" +
      ".answer-item:last-child{border-bottom:none}" +
      ".answer-item .q{font-weight:600;color:#888;font-size:12px}" +
      ".answer-item .a{color:#1a1a1a;margin-top:2px;word-break:break-word}" +
      ".signals{list-style:none}" +
      ".signals li{padding:6px 0;font-size:13px;line-height:1.5;color:#333}" +
      ".reminder{text-align:center;font-size:12px;color:#999;margin-top:32px}";
    const h =
      "<!DOCTYPE html><html lang=zh-Hant><head><meta charset=UTF-8><title>AI創業紅綠燈 判定報告</title><style>" + css +
      "</style></head><body><div class=container>" +
      "<div class=header><h1>AI創業紅綠燈 判定報告</h1><div class=meta>" +
      "判定編號:" + analysisData.analysisId + "<br>判定時間:" + formatTime(analysisData.completedAt || analysisData.createdAt) +
      "<br>版本:v0.4-alpha" + "</div></div>" +
      "<div class=\"light-card light-" + analysisResult.light + "\"><div><span class=light-dot></span><span class=light-label>" + L +
      "</span></div><h2>" + analysisResult.title + "</h2><p>" + analysisResult.oneLineJudgement + "</p></div>" +
      "<div class=card><h3>你的本次回答摘要</h3>" + a + "</div>" + s + sm +
      "<div class=card><h3>最大風險</h3><p class=summary>" + analysisResult.biggestRisk + "</p></div>" +
      "<p class=reminder>請自行保存本檔案。本工具目前不提供永久結果保存。</p>" +
      "</div></body></html>";
    const b = new Blob([h], { type: "text/html;charset=utf-8" });
    const u = URL.createObjectURL(b);
    const el = document.createElement("a");
    el.href = u; el.download = analysisData.analysisId + ".html";
    document.body.appendChild(el); el.click();
    document.body.removeChild(el); URL.revokeObjectURL(u);
  }

  async function handleFeedback(value: FeedbackValue) {
    setFeedbackSent(value);
    try { await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: value }) }); } catch { /* silent */ }
  }

  function renderAnalysisMeta() {
    if (!analysisData) return null;
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-text-secondary">判定編號</p>
            <p className="mt-0.5 break-all text-sm font-mono font-bold text-white">{analysisData.analysisId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-text-secondary">提交時間</p>
            <p className="mt-0.5 text-sm text-white">{formatTime(analysisData.createdAt)}</p>
          </div>
        </div>
        {analysisData.completedAt && (
          <div className="mt-2 flex justify-end border-t border-white/[0.06] pt-2">
            <div className="text-right">
              <p className="text-xs font-medium text-text-secondary">完成時間</p>
              <p className="mt-0.5 text-sm text-white">{formatTime(analysisData.completedAt)}</p>
            </div>
          </div>
        )}
        <div className="mt-2 border-t border-white/[0.06] pt-2">
          <p className="text-xs text-text-secondary/60">版本：v0.4-alpha</p>
        </div>
      </div>
    );
  }

  function renderRejectedResult() {
    if (!analysisData || analysisData.hasSignal) return null;
    return (
      <section className="mb-12 space-y-5">
        {renderAnalysisMeta()}

        <div className="rounded-2xl border border-yellow-light/20 bg-yellow-light/[0.04] px-6 py-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">
            未產生燈號
          </div>
          <h2 className="mb-2 text-lg font-bold text-white">本次判定未產生紅黃綠燈</h2>
          <p className="mx-auto max-w-md text-sm text-text-secondary">
            原因：{analysisData.errorReason || "不明"}
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">判定狀態</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-white/60">狀態：</span>
              <span className="rounded-md border border-yellow-light/20 bg-yellow-light/[0.06] px-2 py-0.5 text-xs font-semibold text-yellow-light">{STATUS_LABEL[analysisData.status] || analysisData.status}</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{analysisData.errorReason}</p>
          </div>
        </div>

        <SectionCard title="你的本次回答摘要">
          <div className="space-y-3">
            {[
              { q: "你的點子是什麼？", a: fullForm.idea },
              { q: "目標使用者是誰？", a: fullForm.targetUser },
              { q: "它解決什麼問題？", a: fullForm.problem },
              { q: "你想怎麼收費？", a: fullForm.pricing },
              { q: "第一版你打算怎麼做？", a: fullForm.firstVersion },
              { q: "你預估多久能完成？", a: fullForm.buildTime },
            ].map((item, i) => (
              <div key={i} className="border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                <p className="text-xs font-medium text-white/50">{i + 1}. {item.q}</p>
                <p className="mt-0.5 text-sm text-white/90 break-words">{item.a}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-center backdrop-blur-sm">
          <p className="text-sm text-text-secondary/60">因本次判定未產生紅黃綠燈，不提供下載正式判定報告。</p>
        </div>
      </section>
    );
  }

  function renderSystemErrorResult() {
    if (!analysisData || analysisData.status !== "failed_system_error") return null;
    return (
      <section className="mb-12 space-y-5">
        {renderAnalysisMeta()}

        <div className="rounded-2xl border border-red-light/20 bg-red-light/[0.04] px-6 py-8 text-center backdrop-blur-sm">
          <h2 className="mb-2 text-lg font-bold text-white">系統錯誤</h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-text-secondary">
            {analysisData.errorReason || "伺服器暫時無法處理判定，請稍後再試。"}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-sm text-yellow-light">
          <p className="font-semibold">付款保留待處理</p>
          <p className="mt-1 text-xs text-yellow-light/70">此筆款項尚未使用，重新提交時系統會保留付款編號。若問題持續，請截圖此畫面並聯繫客服。</p>
        </div>

        <SectionCard title="你的本次回答摘要">
          <div className="space-y-3">
            {[
              { q: "你的點子是什麼？", a: fullForm.idea },
              { q: "目標使用者是誰？", a: fullForm.targetUser },
              { q: "它解決什麼問題？", a: fullForm.problem },
              { q: "你想怎麼收費？", a: fullForm.pricing },
              { q: "第一版你打算怎麼做？", a: fullForm.firstVersion },
              { q: "你預估多久能完成？", a: fullForm.buildTime },
            ].map((item, i) => (
              <div key={i} className="border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                <p className="text-xs font-medium text-white/50">{i + 1}. {item.q}</p>
                <p className="mt-0.5 text-sm text-white/90 break-words">{item.a}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-center backdrop-blur-sm">
          <p className="text-sm text-text-secondary/60">因系統錯誤未完成判定，不提供下載正式判定報告。</p>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-red-light/5 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-green-light/5 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">

        {/* Hero */}
        <header className="mb-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-16 items-center justify-center">
            <svg viewBox="0 0 64 160" className="h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]" fill="none">
              <rect x="8" y="4" width="48" height="152" rx="16" className="fill-white/8 stroke-white/10" strokeWidth="2" />
              <circle cx="32" cy="36" r="14" className="fill-red-light/30 stroke-red-light/40" strokeWidth="2" />
              <circle cx="32" cy="80" r="14" className="fill-yellow-light/20 stroke-yellow-light/30" strokeWidth="2" />
              <circle cx="32" cy="124" r="14" className="fill-green-light/20 stroke-green-light/30" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">AI創業紅綠燈</h1>
          <p className="mx-auto mb-3 max-w-lg text-lg leading-relaxed text-text-secondary">不要因為 AI 做得出來，就急著開工。</p>
          <p className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-text-secondary/70">49 元不是買 AI 回答，是買一次可能幫你省下一週時間的冷靜檢查。</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-medium text-yellow-light">單次完整判定 49 元</div>
        </header>

        {/* Suitable / Unsuitable */}
        <section className="mb-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-light/15 bg-green-light/[0.04] p-5">
            <h3 className="mb-2 text-sm font-semibold text-green-light">適合你，如果：</h3>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你正準備花幾天到幾週做一個 AI 副業、電商、工具或內容產品。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你有 2～5 個點子，不知道哪個該先做。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你曾經因為衝動開工，浪費過時間。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-light/40" />你看到 AI 能做網站或 App 後，開始想動手但缺乏產品判斷框架。</li>
            </ul>
          </div>
          <div className="rounded-xl border border-red-light/15 bg-red-light/[0.04] p-5">
            <h3 className="mb-2 text-sm font-semibold text-red-light">不適合你，如果：</h3>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你只是好奇玩玩，沒有真的要做。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />這個點子 1～2 小時就能完成。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你已經有成熟的產品判斷能力。</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-light/40" />你期待完整創業計畫、陪跑或整改方案。</li>
            </ul>
          </div>
        </section>

        {/* Product boundary notice */}
        <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-text-secondary/60">
          本工具只判定創業、副業、產品、服務、內容、網站、App 或商業點子。不處理一般搜尋、數學題、投資預測、即時新聞、聊天、翻譯、作業或非商業問題。
        </div>

        {/* Risk Scan Form */}
        {!showPayment && !analysisData && (
          <section className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/80 p-6 backdrop-blur-sm sm:p-8">
            <h2 className="mb-2 text-lg font-semibold text-white">先填 3 題，確認要判定的點子</h2>
            <p className="mb-6 text-sm text-text-secondary">先用 3 題整理你的點子。付款後再補充 3 題，系統會依市場跡象與四象限給出紅黃綠燈判定。</p>
            <form className="space-y-4">
              <Field label="你的點子是什麼？" hint="簡短描述你的創業或副業點子">
                <input type="text" value={riskForm.idea} onChange={(e) => updateRiskField("idea", e.target.value)} placeholder="例如：AI 食譜產生器" required maxLength={300} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="目標使用者是誰？" hint="描述你的目標族群">
                <input type="text" value={riskForm.targetUser} onChange={(e) => updateRiskField("targetUser", e.target.value)} placeholder="例如：每天煮飯的家庭主婦" required maxLength={300} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="它解決什麼問題？" hint="描述這個點子想解決的核心問題">
                <input type="text" value={riskForm.problem} onChange={(e) => updateRiskField("problem", e.target.value)} placeholder="例如：不知道每天要煮什麼" required maxLength={300} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <button type="button" onClick={handleRiskNext} disabled={!riskForm.idea?.trim() || !riskForm.targetUser?.trim() || !riskForm.problem?.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
                下一步：付費 49 元開始判定
              </button>
            </form>
          </section>
        )}

        {/* Boundary Error */}
        {boundaryError && !analysisData && (
          <div className="mb-8 rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-sm text-yellow-light">
            {boundaryError.split("\n").map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
          </div>
        )}

        {/* Payment Card */}
        {showPayment && !paymentData && !analysisData && !boundaryError && (
          <section className="mb-8 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-card to-bg-card/60 p-6 backdrop-blur-sm sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">單次完整判定 49 元</div>
            <p className="mb-4 text-sm leading-relaxed text-text-secondary">你已完成前 3 題。付款後請再補充 3 題，系統會根據你的點子、市場跡象、付費可能、交付速度與維護負擔，給出紅燈、黃燈或綠燈判定。</p>
            <p className="mb-6 text-xs text-text-secondary/50">目前 v0.4-alpha 為測試版，付款流程暫以占位呈現。</p>
            <button onClick={handlePaymentClick} disabled={paymentLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-light to-orange-400 px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {paymentLoading ? <><Spinner />建立付款中…</> : "我已了解，開始補充完整判定資料"}
            </button>
          </section>
        )}

        {/* Payment Created Banner */}
        {paymentData && !analysisData && (
          <div className="mb-6 rounded-xl border border-green-light/20 bg-green-light/[0.04] px-5 py-3 text-sm text-green-light">
            <p className="font-semibold">付款成立</p>
            <p className="mt-1 text-xs text-green-light/70">付款編號：{paymentData.id}</p>
            <p className="text-xs text-green-light/70">付款時間：{formatTime(paymentData.createdAt)}</p>
          </div>
        )}

        {/* Payment Disclaimer */}
        {paymentData && !analysisData && (
          <div className="mb-6 rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-xs leading-relaxed text-yellow-light/80">
            <p className="font-semibold text-yellow-light text-sm mb-1">使用條款提醒</p>
            <p>本工具只判斷創業、副業、產品、服務、網站、App、AI 工具、電商、內容型產品等可變現商業點子。付款後送出正式判定，即視為使用一次。若送出的內容不是商業點子、資訊不足、亂填、查詢型任務，系統仍會保留提交紀錄，且本次付款可能視為已使用。</p>
          </div>
        )}

        {/* Full Assessment Form */}
        {showFullForm && paymentData && !analysisData && (
          <section className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/80 p-6 backdrop-blur-sm sm:p-8">
            <h2 className="mb-2 text-lg font-semibold text-white">完整判定</h2>
            <p className="mb-6 text-sm text-text-secondary">已帶入風險掃描的 3 題，請再補充 3 題，取得正式紅黃綠燈結果。</p>
            <form onSubmit={handleFullSubmit} className="space-y-4">
              <Field label="你的點子是什麼？" hint="簡短描述你的創業或副業點子">
                <input type="text" value={fullForm.idea} onChange={(e) => updateFullField("idea", e.target.value)} required maxLength={300} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="目標使用者是誰？" hint="描述你的目標族群">
                <input type="text" value={fullForm.targetUser} onChange={(e) => updateFullField("targetUser", e.target.value)} required maxLength={300} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="它解決什麼問題？" hint="描述這個點子想解決的核心問題">
                <input type="text" value={fullForm.problem} onChange={(e) => updateFullField("problem", e.target.value)} required maxLength={300} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="你想怎麼收費？" hint="描述收費方式或商業模式">
                <input type="text" value={fullForm.pricing} onChange={(e) => updateFullField("pricing", e.target.value)} required maxLength={400} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="第一版你打算怎麼做？" hint="描述第一版的範圍">
                <input type="text" value={fullForm.firstVersion} onChange={(e) => updateFullField("firstVersion", e.target.value)} required maxLength={400} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <Field label="你預估多久能完成？" hint="預估開發時間">
                <input type="text" value={fullForm.buildTime} onChange={(e) => updateFullField("buildTime", e.target.value)} required maxLength={400} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
              </Field>
              <button type="submit" disabled={fullLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
                {fullLoading ? <><Spinner />判定中…</> : "送出完整判定"}
              </button>
            </form>
          </section>
        )}

        {/* Full Assessment Error */}
        {fullError && !analysisData && (
          <div className="mb-8 rounded-xl border border-red-light/20 bg-red-light/5 px-5 py-4 text-sm text-red-light"><span className="font-semibold">錯誤：</span>{fullError}</div>
        )}

        {/* Result: Rejected */}
        {analysisData && !analysisData.hasSignal && analysisData.status.startsWith("rejected") && renderRejectedResult()}

        {/* Result: System Error */}
        {analysisData && analysisData.status === "failed_system_error" && renderSystemErrorResult()}

        {/* Result: Success */}
        {analysisData && analysisData.hasSignal && analysisResult && (
          <section className="mb-12 space-y-5">
            {renderAnalysisMeta()}

            <div className={`rounded-2xl border px-6 py-6 text-center backdrop-blur-sm ${(lightConfig[analysisResult.light] || lightConfig.red).border}`}>
              <div className={`mx-auto mb-4 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-sm font-semibold ${(lightConfig[analysisResult.light] || lightConfig.red).css}`}>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${(lightConfig[analysisResult.light] || lightConfig.red).dot}`} />{(lightConfig[analysisResult.light] || lightConfig.red).label}
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">{analysisResult.title}</h2>
              <p className="text-sm text-white/80">{analysisResult.oneLineJudgement}</p>
            </div>

            {analysisResult.isHighRisk && (
              <div className="rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-xs leading-relaxed text-yellow-light/80">
                此類點子涉及醫療、法律、金融或其他高風險場景。本工具只能做開工前的商業風險提醒，不構成法律、財務、醫療或合規建議。
              </div>
            )}

            <SectionCard title="你的本次回答摘要">
              <div className="space-y-3">
                {[
                  { q: "你的點子是什麼？", a: fullForm.idea },
                  { q: "目標使用者是誰？", a: fullForm.targetUser },
                  { q: "它解決什麼問題？", a: fullForm.problem },
                  { q: "你想怎麼收費？", a: fullForm.pricing },
                  { q: "第一版你打算怎麼做？", a: fullForm.firstVersion },
                  { q: "你預估多久能完成？", a: fullForm.buildTime },
                ].map((item, i) => (
                  <div key={i} className="border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-white/50">{i + 1}. {item.q}</p>
                    <p className="mt-0.5 text-sm text-white/90 break-words">{item.a}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {analysisResult.marketSignals && analysisResult.marketSignals.length > 0 && (
              <SectionCard title="根據填寫內容推估的市場跡象">
                <ul className="space-y-2">
                  {analysisResult.marketSignals.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white/80">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />{s}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {analysisResult.quadrantSummary && (
              <SectionCard title="判定摘要">
                <p className="text-sm text-white/80">{analysisResult.quadrantSummary.summary}</p>
              </SectionCard>
            )}

            <SectionCard title="最大風險">
              <p className="text-sm text-white/80">{analysisResult.biggestRisk}</p>
            </SectionCard>

            {analysisResult.oneLineJudgement.startsWith("測試模式") && (
              <div className="rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-3 text-xs text-yellow-light/80">
                目前為本機測試模式，結果為固定假資料。設定 OPENAI_API_KEY 後才會啟用正式 AI 判定。
              </div>
            )}

            <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
              <p className="mb-4 text-sm text-text-secondary/60 text-center">將此判定儲存為獨立的 HTML 報告檔案。</p>
              <button onClick={handleDownloadReport} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90">
                下載本次判定
              </button>
              <p className="mt-2 text-xs text-center text-text-secondary/50">請自行保存本檔案。本工具目前不提供永久結果保存。</p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">這次判定準嗎？</h3>
              <div className="flex gap-3">
                {(["準", "普通", "不準"] as const).map((value) => (
                  <button key={value} onClick={() => handleFeedback(value)} disabled={feedbackSent !== null}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${feedbackSent === value ? "border-white/30 bg-white/10 text-white" : "border-white/[0.08] text-text-secondary hover:border-white/20 hover:text-white"} disabled:cursor-not-allowed disabled:opacity-50`}>{value}</button>
                ))}
              </div>
              {feedbackSent && <p className="mt-3 text-xs text-green-light/70">感謝回饋！</p>}
            </div>
          </section>
        )}

        {/* Demo Cases */}
        {!analysisData && (
          <section className="mb-12">
            <h2 className="mb-6 text-center text-lg font-semibold text-white">精選示範案例</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {DEMO_CASES.map((c, i) => {
                const lc = lightConfig[c.light];
                return (
                  <div key={i} className={`rounded-xl border p-5 backdrop-blur-sm ${lc.border}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${lc.dot}`} />
                      <span className={`text-sm font-semibold ${lc.css.split(" ")[1]}`}>{lc.label}</span>
                    </div>
                    <h3 className="mb-1.5 text-sm font-semibold text-white">{c.title}</h3>
                    <p className="text-xs leading-relaxed text-text-secondary">{c.judgement}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-white/15">AI創業紅綠燈 v0.4-alpha — 僅供參考，請自行驗證市場需求</footer>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm"><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">{title}</h3>{children}</div>);
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (<label className="block space-y-1.5"><span className="block text-sm font-medium text-white/80">{label}</span><span className="block text-xs text-white/30">{hint}</span>{children}</label>);
}

function Spinner() {
  return (<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>);
}
