"use client";

import { Spinner, formatTime } from "./ui";
import { FIRST_REPORT_PRICE_TWD } from "@/lib/pricing";

interface PaymentPanelProps {
  showPayment: boolean;
  paymentData: { id: string; createdAt: string } | null;
  paymentConfirmed: boolean;
  paymentLoading: boolean;
  confirmLoading: boolean;
  boundaryError: string | null;
  analysisData: unknown;
  onPaymentClick: () => void;
  onConfirmPayment: () => void;
}

export function PaymentPanel({ showPayment, paymentData, paymentConfirmed, paymentLoading, confirmLoading, boundaryError, analysisData, onPaymentClick, onConfirmPayment }: PaymentPanelProps) {
  return (
    <>
      {/* Payment Card */}
      {showPayment && !paymentData && !paymentConfirmed && !analysisData && !boundaryError && (
        <section className="mb-8 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-card to-bg-card/60 p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">首次完整報告 49 元</div>
          <p className="mb-4 text-sm leading-relaxed text-text-secondary">你已完成前 3 題。付款後請再補充 3 題，系統會根據你的點子、市場跡象、付費可能、交付速度與維護負擔，給出紅燈、黃燈或綠燈判定。</p>
          <p className="mb-6 text-xs text-text-secondary/50">目前 v0.4-alpha 為測試版，付款流程暫以占位呈現。</p>
          <button onClick={onPaymentClick} disabled={paymentLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-light to-orange-400 px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {paymentLoading ? <><Spinner />建立付款中…</> : "我已了解，開始補充完整判定資料"}
          </button>
        </section>
      )}

      {/* Payment Created Banner */}
      {paymentData && !paymentConfirmed && !analysisData && (
        <section className="mb-8 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-card to-bg-card/60 p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">首次完整報告 49 元</div>
          <p className="mb-4 text-sm leading-relaxed text-text-secondary">點擊下方按鈕模擬付款，確認後即可開始填寫完整判定資料。</p>
          <p className="mb-6 text-xs text-text-secondary/50">付款編號：{paymentData.id}</p>
          <button onClick={onConfirmPayment} disabled={confirmLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-light to-orange-400 px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {confirmLoading ? <><Spinner />付款確認中…</> : "確認付款 " + FIRST_REPORT_PRICE_TWD + " 元"}
          </button>
        </section>
      )}

      {paymentConfirmed && !analysisData && (
        <div className="mb-6 rounded-xl border border-green-light/20 bg-green-light/[0.04] px-5 py-3 text-sm text-green-light">
          <p className="font-semibold">付款成立</p>
          <p className="mt-1 text-xs text-green-light/70">付款編號：{paymentData!.id}</p>
          <p className="text-xs text-green-light/70">付款時間：{formatTime(paymentData!.createdAt)}</p>
        </div>
      )}

      {paymentConfirmed && !analysisData && (
        <div className="mb-6 rounded-xl border border-yellow-light/20 bg-yellow-light/[0.04] px-5 py-4 text-xs leading-relaxed text-yellow-light/80">
          <p className="font-semibold text-yellow-light text-sm mb-1">使用條款提醒</p>
          <p>本工具只判斷創業、副業、產品、服務、網站、App、AI 工具、電商、內容型產品等可變現商業點子。付款後送出正式判定，即視為使用一次。若送出的內容不是商業點子、資訊不足、亂填、查詢型任務，系統仍會保留提交紀錄，且本次付款可能視為已使用。</p>
        </div>
      )}
    </>
  );
}
