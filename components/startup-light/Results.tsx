"use client";
import React from "react";

import type { AnalysisResult } from "@/app/api/analyze-idea/route";
import type { SubmitAnalysisResponse } from "@/app/api/submit-analysis/route";
import { SectionCard, lightConfig, formatTime, STATUS_LABEL } from "./ui";

type FeedbackValue = "準" | "普通" | "不準";

// ─── AnalysisMeta ───

interface AnalysisMetaProps {
  analysisData: SubmitAnalysisResponse;
}

export function AnalysisMeta({ analysisData }: AnalysisMetaProps) {
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

// ─── AnswerSummary (reusable list of Q&A) ───

interface AnswerSummaryProps {
  answers: { q: string; a: string }[];
}

export function AnswerSummary({ answers }: AnswerSummaryProps) {
  return (
    <div className="space-y-3">
      {answers.map((item, i) => (
        <div key={i} className="border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
          <p className="text-xs font-medium text-white/50">{i + 1}. {item.q}</p>
          <p className="mt-0.5 text-sm text-white/90 break-words">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

// ─── DownloadReportButton ───

interface DownloadReportButtonProps {
  analysisResult: AnalysisResult;
  analysisData: SubmitAnalysisResponse;
  answers: { q: string; a: string }[];
}

export function DownloadReportButton({ analysisResult, analysisData, answers }: DownloadReportButtonProps) {
  const handleDownload = () => {
    const L = (lightConfig[analysisResult.light] || lightConfig.red).label;

    let a = "";
    for (let i = 0; i < answers.length; i++) {
      a += "<div class=answer-item><div class=q>" + (i + 1) + ". " + answers[i].q + "</div><div class=a>" + answers[i].a + "</div></div>";
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
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
      <p className="mb-4 text-sm text-text-secondary/60 text-center">將此判定儲存為獨立的 HTML 報告檔案。</p>
      <button onClick={handleDownload} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90">
        下載本次判定
      </button>
      <p className="mt-2 text-xs text-center text-text-secondary/50">請自行保存本檔案。本工具目前不提供永久結果保存。</p>
    </div>
  );
}

// ─── FeedbackButtons ───

interface FeedbackButtonsProps {
  feedbackSent: FeedbackValue | null;
  onFeedback: (value: FeedbackValue) => void;
}

export function FeedbackButtons({ feedbackSent, onFeedback }: FeedbackButtonsProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">本次判定有收穫嗎？</h3>
      <div className="flex gap-3">
        {[{ value: "準" as const, label: "有" }, { value: "普通" as const, label: "普通" }, { value: "不準" as const, label: "沒有" }].map(({ value, label }) => {
          const btnClass = feedbackSent === value
            ? "border-white/30 bg-white/10 text-white"
            : "border-white/[0.08] text-text-secondary hover:border-white/20 hover:text-white";
          return (
            <button key={value} onClick={() => onFeedback(value)} disabled={feedbackSent !== null}
              className={"rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 " + btnClass}
            >{label}</button>
          );
        })}
      </div>
      {feedbackSent && <p className="mt-3 text-xs text-green-light/70">感謝回饋！</p>}
    </div>
  );
}
// ─── RevisionNotice ───

interface RevisionNoticeProps {
  remainingAttempts: number | undefined;
  onReset: () => void;
}

export function RevisionNotice({ remainingAttempts, onReset }: RevisionNoticeProps) {
  if (remainingAttempts !== undefined && remainingAttempts > 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">請補充內容後重新送出</h3>
        <div className="space-y-3">
          <p className="text-center text-sm text-text-secondary/60">你可以修改回答後重新送出，無需重新付款。本次付款剩餘修改次數：{remainingAttempts} 次。</p>
          <button onClick={onReset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            修改回答並重新判定
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">本次修改次數已用完</h3>
      <p className="text-center text-sm text-text-secondary/60">本次付款的修改機會已用完，無法再重新送出。請重新開始一次新的判定。</p>
    </div>
  );
}


// ─── ErrorReportSection ───

const ISSUE_TYPES = [
  "付款後沒有正常產生結果",
  "下載報告無法開啟",
  "判定內容出現亂碼或格式錯誤",
  "判定結果頁顯示異常",
  "我已付款但系統顯示未付款",
  "其他系統錯誤",
] as const;

interface ErrorReportSectionProps {
  analysisId: string;
  paymentId: string;
}

function ErrorReportSection({ analysisId, paymentId }: ErrorReportSectionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [issueType, setIssueType] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (file) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setError("只接受 JPG、PNG 或 WebP 格式。");
        e.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("圖片大小不可超過 5MB。");
        e.target.value = "";
        return;
      }
    }
    setScreenshot(file);
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const canSubmit = issueType.length > 0 && email.length > 0 && EMAIL_RE.test(email) && screenshot !== null;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("analysisId", analysisId);
      fd.append("paymentId", paymentId);
      fd.append("issueType", issueType);
      fd.append("email", email);
      fd.append("screenshot", screenshot!);
      const res = await fetch("/api/error-report", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "送出失敗。");
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "無法連接到伺服器。");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-light/20 bg-green-light/[0.04] px-5 py-4 text-sm text-green-light">
        <p className="font-semibold">問題回報已送出</p>
        <p className="mt-1 text-xs text-green-light/70 leading-relaxed">已收到你的問題回報。我們會依付款編號、判定編號與系統紀錄進行確認。</p>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => { setExpanded(!expanded); setError(null); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
        {expanded ? "關閉問題回報" : "問題回報"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* issueType */}
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium text-white/80">問題類型</span>
            <select value={issueType} onChange={e => { setIssueType(e.target.value); setError(null); }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-white/20">
              <option value="" disabled className="bg-[#1a1a24]">請選擇問題類型</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a24]">{t}</option>)}
            </select>
          </label>

          {/* email */}
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium text-white/80">電子信箱</span>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }} placeholder="example@email.com" required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20"
            />
          </label>

          {/* screenshot */}
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium text-white/80">截圖（JPG / PNG / WebP，限 5MB）</span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange}
              className="w-full text-sm text-white/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/20"
            />
            {screenshot && (
              <p className="text-xs text-white/50">已選擇：{screenshot.name}（{(screenshot.size / 1024).toFixed(1)} KB）</p>
            )}
          </label>

          {error && (
            <p className="text-sm text-red-light">{error}</p>
          )}

          <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "送出中…" : "送出問題回報"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AnalysisSuccess (full success result) ───

interface AnalysisSuccessProps {
  analysisData: SubmitAnalysisResponse;
  analysisResult: AnalysisResult;
  answers: { q: string; a: string }[];
  feedbackSent: FeedbackValue | null;
  onFeedback: (value: FeedbackValue) => void;
}

export function AnalysisSuccess({ analysisData, analysisResult, answers, feedbackSent, onFeedback }: AnalysisSuccessProps) {
  const lc = lightConfig[analysisResult.light] || lightConfig.red;

  return (
      <section className="mb-12 space-y-5">
      {/* a. 紅黃綠判定結果 */}
      <div className={`rounded-2xl border px-6 py-6 text-center backdrop-blur-sm ${lc.border}`}>
        <div className={`mx-auto mb-4 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-sm font-semibold ${lc.css}`}>
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${lc.dot}`} />{lc.label}
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">{analysisResult.title}</h2>
        <p className="text-sm text-white/80">{analysisResult.oneLineJudgement}</p>
      </div>

      {/* b. 判定時間 / 判定ID / 版本 */}
      <AnalysisMeta analysisData={analysisData} />

      {analysisResult.isHighRisk && (
        <div className="rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-xs leading-relaxed text-yellow-light/80">
          此類點子涉及醫療、法律、金融或其他高風險場景。本工具只能做開工前的商業風險提醒，不構成法律、財務或醫療建議。
        </div>
      )}

      {/* c. 判定摘要 */}
      {analysisResult.quadrantSummary && (
        <SectionCard title="判定摘要">
          <p className="text-sm text-white/80">{analysisResult.quadrantSummary.summary}</p>
        </SectionCard>
      )}

      {/* d. 最大風險 */}
      <SectionCard title="最大風險">
        <p className="text-sm text-white/80">{analysisResult.biggestRisk}</p>
      </SectionCard>

      {analysisResult.oneLineJudgement.startsWith("測試模式") && (
        <div className="rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-3 text-xs text-yellow-light/80">
          目前為本機測試模式，結果為固定假資料。設定 OPENAI_API_KEY 後才會啟用正式 AI 判定。
        </div>
      )}

      {/* e. 市場跡象 */}
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

      {/* f. 六題回答摘要 */}
      <SectionCard title="你的本次回答摘要">
        <AnswerSummary answers={answers} />
      </SectionCard>

      {/* g. 下載報告與回饋 */}
      <DownloadReportButton analysisResult={analysisResult} analysisData={analysisData} answers={answers} />
      <ErrorReportSection analysisId={analysisData.analysisId} paymentId={analysisData.paymentId} />
      <FeedbackButtons feedbackSent={feedbackSent} onFeedback={onFeedback} />
    </section>
  );
}



