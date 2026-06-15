"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-12 items-center justify-center">
          <svg viewBox="0 0 64 160" className="h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]" fill="none">
            <rect x="8" y="4" width="48" height="152" rx="16" className="fill-white/8 stroke-white/10" strokeWidth="2" />
            <circle cx="32" cy="36" r="14" className="fill-red-light/30 stroke-red-light/40" strokeWidth="2" />
            <circle cx="32" cy="80" r="14" className="fill-yellow-light/20 stroke-yellow-light/30" strokeWidth="2" />
            <circle cx="32" cy="124" r="14" className="fill-green-light/20 stroke-green-light/30" strokeWidth="2" />
          </svg>
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-white">
          頁面載入時發生錯誤
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-text-secondary">
          請重新整理頁面，或回到首頁再試一次。
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90"
          >
            重新整理
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            回到首頁
          </button>
        </div>
        {(typeof process !== "undefined" && process.env.NODE_ENV === "development") && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-xs text-white/30 hover:text-white/50">
              錯誤詳細資訊
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-white/[0.04] p-4 text-xs text-red-light/70">
              {error.message}
              {error.digest && `\n\ndigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
