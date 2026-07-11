"use client";

import { useState } from "react";

const navItems = [
  { href: "/en#who-it-is-for", label: "Who It's For" },
  { href: "/en#how-it-works", label: "How It Works" },
  { href: "/en#preview-check", label: "Preview" },
] as const;

export function EnHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuId = "en-mobile-nav-menu";

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <nav className="relative w-full border-b border-white/[0.06] bg-bg-primary">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <a
          href="/en"
          className="whitespace-nowrap text-lg font-semibold text-white/70 transition-colors hover:text-green-light sm:text-xl"
        >
          AI Startup Traffic Light
        </a>

        <div className="hidden items-center gap-x-5 text-sm sm:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-text-secondary transition-colors hover:text-green-light"
            >
              {item.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          className="-mr-2 inline-flex items-center justify-center p-2 text-white/70 transition-colors hover:text-green-light sm:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          id={mobileMenuId}
          className="absolute left-0 right-0 top-full z-50 space-y-1 border-t border-white/[0.06] bg-bg-primary/95 px-4 pb-4 pt-2 backdrop-blur-md sm:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className="block rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-green-light"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
