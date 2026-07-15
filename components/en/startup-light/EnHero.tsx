export function EnHero() {
  return (
    <header className="mb-16 text-center">
      <div className="mx-auto mb-6 flex h-14 w-28 items-center justify-center">
        <svg
          viewBox="0 0 160 64"
          className="h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]"
          fill="none"
          aria-hidden="true"
        >
          <rect x="4" y="8" width="152" height="48" rx="20" className="fill-white/8 stroke-white/10" strokeWidth="2" />
          <circle cx="36" cy="32" r="16" className="fill-red-light/25 stroke-red-light/35" strokeWidth="2" />
          <circle cx="80" cy="32" r="16" className="fill-yellow-light/18 stroke-yellow-light/28" strokeWidth="2" />
          <circle cx="124" cy="32" r="16" className="fill-green-light/25 stroke-green-light/40" strokeWidth="2" />
        </svg>
      </div>
      <h1 className="mb-4 text-4xl font-bold leading-snug tracking-normal text-white sm:text-5xl">
        Before you build,
        <br />
        pressure-test the idea.
      </h1>
      <p className="mx-auto mb-1 max-w-lg text-lg leading-relaxed text-text-secondary">
        AI makes building easier. It does not prove demand.
      </p>
      <p className="mx-auto mb-3 max-w-lg text-lg leading-relaxed text-text-secondary">
        Slow down once before you spend weeks shipping the wrong thing.
      </p>
      <p className="mx-auto max-w-lg text-sm leading-relaxed text-text-secondary/70">
        Answer three preview questions to clarify your AI tool, micro-SaaS, or side-project idea. This English preview
        helps you shape the idea before the full analysis flow is available.
      </p>
    </header>
  );
}
