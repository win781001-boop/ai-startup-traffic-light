const goodFitItems = [
  "You are preparing an AI tool, micro-SaaS, website, app, or digital service.",
  "You have several ideas and need to decide which one deserves attention first.",
  "You can build the product, but you are not sure the direction is worth building.",
  "You want to check demand, pricing, delivery, and execution risk before investing more time.",
];

const poorFitItems = [
  "You only want to play with AI and are not ready to commit real effort.",
  "You need a full business plan, fundraising deck, coaching program, or guarantee.",
  "You expect the system to rewrite the idea, design the product, or build it for you.",
  "You want general search, homework help, translation, live news, investment predictions, or open-ended chat.",
];

function FitCard({
  title,
  tone,
  items,
}: Readonly<{
  title: string;
  tone: "green" | "red";
  items: string[];
}>) {
  const colorClass = tone === "green" ? "border-green-light/15 bg-green-light/[0.04] text-green-light" : "border-red-light/15 bg-red-light/[0.04] text-red-light";
  const dotClass = tone === "green" ? "bg-green-light/40" : "bg-red-light/40";

  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ul className="space-y-1.5 text-sm text-text-secondary">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EnFitSection() {
  return (
    <section className="mb-12 grid gap-4 sm:grid-cols-2">
      <FitCard title="Good fit if..." tone="green" items={goodFitItems} />
      <FitCard title="Not a fit if..." tone="red" items={poorFitItems} />
    </section>
  );
}
