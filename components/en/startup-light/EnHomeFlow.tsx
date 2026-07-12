import { EnFitSection } from "./EnFitSection";
import { EnHero } from "./EnHero";
import { EnPrecheckPreview } from "./EnPrecheckPreview";
import { EnScopeNotice } from "./EnScopeNotice";

export function EnHomeFlow() {
  return (
    <main className="min-h-screen bg-bg-primary text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[480px] w-[480px] rounded-full bg-green-light/7 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[380px] w-[380px] rounded-full bg-white/5 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <EnHero />
        <EnFitSection />
        <EnScopeNotice />
        <EnPrecheckPreview />
      </div>
    </main>
  );
}
