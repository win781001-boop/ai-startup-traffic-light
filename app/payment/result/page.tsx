"use client";

import { useState, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "loading" | "not_found" | "error";

interface StatusResponse {
  paymentId: string;
  status: string;
  paidAt: string | null;
  amountTwd: number;
  analysisId: string | null;
}

export default function PaymentResultPage() {
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [pollCount, setPollCount] = useState(0);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [apiAnalysisId, setApiAnalysisId] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [amountTwd, setAmountTwd] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("paymentId");
    const aid = params.get("analysisId");
    setPaymentId(pid);
    setAnalysisId(aid);
    if (!pid) {
      setStatus("not_found");
    }
  }, []);

  // Poll payment status
  useEffect(() => {
    if (!paymentId) return;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/payment-status?paymentId=${encodeURIComponent(paymentId!)}`);
        if (res.status === 404) {
          setStatus("not_found");
          stopPolling();
          return;
        }
        if (!res.ok) {
          setStatus("error");
          stopPolling();
          return;
        }
        const data: StatusResponse = await res.json();
        if (data.analysisId) {
          setApiAnalysisId(data.analysisId);
        }
        if (data.amountTwd !== undefined) {
          setAmountTwd(data.amountTwd);
        }
        if (data.status === "paid") {
          setStatus("paid");
          setPaidAt(data.paidAt);
          stopPolling();
          return;
        }
        if (data.status === "failed" || data.status === "expired") {
          setStatus(data.status);
          stopPolling();
          return;
        }
        // Still pending — continue polling
        setStatus("pending");
        setPollCount((prev) => {
          const next = prev + 1;
          if (next >= MAX_POLLS) {
            stopPolling();
          }
          return next;
        });
      } catch {
        setStatus("error");
        stopPolling();
      }
    }

    // Start polling
    fetchStatus(); // immediate first check
    pollingRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    function stopPolling() {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [paymentId]);

  const effectiveAnalysisId = apiAnalysisId || analysisId;

  // ─── Loading / No paymentId ───
  if (!paymentId) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
          <h1 className="mb-3 text-xl font-bold text-white">找不到付款資訊</h1>
          <p className="mb-6 text-sm text-text-secondary">請確認付款連結是否完整，或重新建立付款。</p>
          <HomeButton />
        </div>
      </PageShell>
    );
  }

  if (status === "loading") {
    return (
      <PageShell>
        <div className="rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
          <h1 className="mb-3 text-xl font-bold text-white">查詢付款狀態中…</h1>
          <Spinner />
        </div>
      </PageShell>
    );
  }

  // ─── Paid ───
  if (status === "paid") {
    return (
      <PageShell>
        <div className="rounded-2xl border border-green-light/20 bg-green-light/[0.04] p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-green-light/30 bg-green-light/10 px-4 py-1.5 text-sm font-semibold text-green-light">
            付款成功
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">感謝你的付款！</h1>
          <p className="mb-2 text-sm text-text-secondary">付款編號：{paymentId}</p>
          {paidAt && <p className="mb-6 text-xs text-text-secondary/60">付款時間：{formatTime(paidAt)}</p>}
          {amountTwd !== null && <p className="mb-6 text-xs text-text-secondary/60">金額：NT$ {amountTwd}</p>}
          <a
            href={`/?paymentId=${encodeURIComponent(paymentId)}&analysisId=${effectiveAnalysisId ? encodeURIComponent(effectiveAnalysisId) : ""}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90"
          >
            開始填寫後三題
          </a>
        </div>
      </PageShell>
    );
  }

  // ─── Pending (still polling or exhausted) ───
  if (status === "pending") {
    const exhausted = pollCount >= MAX_POLLS;
    return (
      <PageShell>
        <div className="rounded-2xl border border-yellow-light/20 bg-yellow-light/[0.04] p-8 text-center backdrop-blur-sm">
          {!exhausted ? (
            <>
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">
                <SpinnerSmall /> 處理中
              </div>
              <h1 className="mb-2 text-xl font-bold text-white">付款處理中，請稍候</h1>
              <p className="text-sm text-text-secondary">我們正在確認你的付款，這通常只需要幾秒鐘。</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-light/30 bg-yellow-light/10 px-4 py-1.5 text-sm font-semibold text-yellow-light">
                處理逾時
              </div>
              <h1 className="mb-2 text-xl font-bold text-white">付款仍在處理中</h1>
              <p className="mb-6 text-sm leading-relaxed text-text-secondary">
                付款尚未完成確認。如果已收到付款通知，請重新整理此頁或回到首頁重新開始。
              </p>
              <HomeButton />
            </>
          )}
        </div>
      </PageShell>
    );
  }

  // ─── Failed / Expired ───
  if (status === "failed" || status === "expired") {
    return (
      <PageShell>
        <div className="rounded-2xl border border-red-light/20 bg-red-light/[0.04] p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-red-light/30 bg-red-light/10 px-4 py-1.5 text-sm font-semibold text-red-light">
            {status === "failed" ? "付款失敗" : "付款已過期"}
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">
            {status === "failed" ? "付款未完成" : "付款已逾期"}
          </h1>
          <p className="mb-6 text-sm text-text-secondary">
            {status === "failed"
              ? "付款未能成功處理，請重新建立付款並再試一次。"
              : "此筆付款已超過有效時間，請重新建立付款。"}
          </p>
          <HomeButton />
        </div>
      </PageShell>
    );
  }

  // ─── Payment not found ───
  if (status === "not_found") {
    return (
      <PageShell>
        <div className="rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
          <h1 className="mb-3 text-xl font-bold text-white">找不到付款資訊</h1>
          <p className="mb-6 text-sm text-text-secondary">查無此付款編號，請確認資料是否正確。</p>
          <HomeButton />
        </div>
      </PageShell>
    );
  }

  // ─── Error ───
  return (
    <PageShell>
      <div className="rounded-2xl border border-border-subtle bg-bg-card/60 p-8 text-center backdrop-blur-sm">
        <h1 className="mb-3 text-xl font-bold text-white">發生錯誤</h1>
        <p className="mb-6 text-sm text-text-secondary">無法查詢付款狀態，請稍後再試。</p>
        <HomeButton />
      </div>
    </PageShell>
  );
}

// ─── Shared layout ───

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-green-light/5 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-lg px-4 py-20 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">AI創業紅綠燈</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function HomeButton() {
  return (
    <a
      href="/"
      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
    >
      回到首頁
    </a>
  );
}

function Spinner() {
  return (
    <div className="mt-4 flex justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
    </div>
  );
}

function SpinnerSmall() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}
