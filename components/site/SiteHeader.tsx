"use client";
import { useState, useRef, useEffect } from "react";

export default function SiteHeader() {
  const [learnOpen, setLearnOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (learnRef.current && !learnRef.current.contains(e.target as Node)) {
        setLearnOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-full border-b border-white/[0.06] bg-bg-primary">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <a
          href="/"
          className="whitespace-nowrap text-lg sm:text-xl font-semibold text-white/70 hover:text-red-light transition-colors"
        >
          AI創業紅綠燈
        </a>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <a href="/" className="text-text-secondary hover:text-red-light transition-colors">
            首頁
          </a>
          <span aria-hidden="true" className="text-slate-400/60 select-none">|</span>
          <div className="relative" ref={learnRef}>
            <button
              onClick={() => setLearnOpen(!learnOpen)}
              className="flex items-center gap-1 text-text-secondary hover:text-red-light transition-colors cursor-pointer"
            >
              AI創業小學堂
              <svg
                className="h-3 w-3 mt-0.5 transition-transform duration-200"
                viewBox="0 0 12 12"
                fill="none"
                style={{ transform: learnOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {learnOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[12rem] rounded-lg border border-white/[0.06] bg-bg-card/95 backdrop-blur-md p-1.5 shadow-lg">
                <a
                  href="/learn/ai-side-project"
                  onClick={() => setLearnOpen(false)}
                  className="block rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-red-light transition-colors"
                >
                  AI 副業開工前檢查
                </a>
                <a
                  href="/learn/ai-passive-income"
                  onClick={() => setLearnOpen(false)}
                  className="block rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-red-light transition-colors"
                >
                  AI 被動收入是真的嗎
                </a>
                <a
                  href="/one-person-company-opc"
                  onClick={() => setLearnOpen(false)}
                  className="block rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-red-light transition-colors"
                >
                  一人公司 OPC
                </a>
              </div>
            )}
          </div>
          <span aria-hidden="true" className="text-slate-400/60 select-none">|</span>
          <a href="/" className="text-text-secondary hover:text-red-light transition-colors">
            開工前檢查
          </a>
        </div>
      </div>
    </nav>
  );
}
