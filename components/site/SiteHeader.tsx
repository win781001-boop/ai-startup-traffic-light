"use client";
import { useState, useRef, useEffect } from "react";

export default function SiteHeader() {
  const [learnOpen, setLearnOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [learnMobileOpen, setLearnMobileOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = "mobile-nav-menu";

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
    <nav className="relative w-full border-b border-white/[0.06] bg-bg-primary">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <a
          href="/"
          className="whitespace-nowrap text-lg sm:text-xl font-semibold text-white/70 hover:text-red-light transition-colors"
        >
          AI創業紅綠燈
        </a>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-x-5 text-sm">
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
          <a href="/learn/ai-startup-questions" className="text-text-secondary hover:text-red-light transition-colors">
            AI創業 QA
          </a>
          <span aria-hidden="true" className="text-slate-400/60 select-none">|</span>
          <a href="/" className="text-text-secondary hover:text-red-light transition-colors">
            開工前檢查
          </a>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="sm:hidden inline-flex items-center justify-center p-2 -mr-2 text-white/70 hover:text-red-light transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div
          id={mobileMenuId}
          className="sm:hidden absolute left-0 right-0 top-full z-50 border-t border-white/[0.06] bg-bg-primary/95 backdrop-blur-md px-4 pb-4 pt-2 space-y-1"
        >
          <a
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:text-red-light hover:bg-white/[0.03] transition-colors"
          >
            開工前檢查
          </a>
          <a
            href="/learn/ai-startup-questions"
            onClick={() => setMobileOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:text-red-light hover:bg-white/[0.03] transition-colors"
          >
            AI創業 QA
          </a>
          <div>
            <button
              onClick={() => setLearnMobileOpen(!learnMobileOpen)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-text-secondary hover:text-red-light hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              AI創業小學堂
              <svg
                className="h-3 w-3 transition-transform duration-200"
                viewBox="0 0 12 12"
                fill="none"
                style={{ transform: learnMobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {learnMobileOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3">
                <a
                  href="/learn/ai-side-project"
                  onClick={() => { setMobileOpen(false); setLearnMobileOpen(false); }}
                  className="block rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-red-light hover:bg-white/[0.03] transition-colors"
                >
                  AI 副業開工前檢查
                </a>
                <a
                  href="/learn/ai-passive-income"
                  onClick={() => { setMobileOpen(false); setLearnMobileOpen(false); }}
                  className="block rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-red-light hover:bg-white/[0.03] transition-colors"
                >
                  AI 被動收入是真的嗎
                </a>
                <a
                  href="/one-person-company-opc"
                  onClick={() => { setMobileOpen(false); setLearnMobileOpen(false); }}
                  className="block rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-red-light hover:bg-white/[0.03] transition-colors"
                >
                  一人公司 OPC
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
