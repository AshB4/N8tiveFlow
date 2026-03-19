import AppTopNav from "../Components/AppTopNav";

const signalCards = [
  {
    title: "Amazon Signals",
    eyebrow: "Buying intent",
    accent: "border-amber-500/60 bg-amber-500/10 text-amber-200",
    points: [
      "Use Movers & Shakers for what is moving right now.",
      "Use Best Sellers for proven demand.",
      "Use Customers also bought for niche clustering.",
      "Look for 4.3+ rating, strong review count, specific niche, and clean images.",
    ],
  },
  {
    title: "Pinterest Signals",
    eyebrow: "Click intent",
    accent: "border-pink-500/60 bg-pink-500/10 text-pink-200",
    points: [
      "Use search autocomplete to grab real phrases.",
      "Study top pins for repeated visuals and wording.",
      "Look for repeated styles like cozy, goth, aesthetic, kawaii, spooky.",
      "Treat every affiliate pin as an answer to a search.",
    ],
  },
  {
    title: "Performance Signals",
    eyebrow: "Your edge",
    accent: "border-cyan-500/60 bg-cyan-500/10 text-cyan-200",
    points: [
      "Track which pins get clicks.",
      "Track which pins get saves.",
      "Track which ones die so they stop eating schedule space.",
      "Double down on winners and reuse them later.",
    ],
  },
];

const dailyLoop = [
  "Search Pinterest and capture 2-3 exact phrases people are already using.",
  "Match those phrases to 1-2 Amazon products with clean visuals and specific use cases.",
  "Validate quickly: would I click this, does it match the search exactly, does it look good?",
  "Post only after the search-to-product match is clear.",
];

const quickChecks = [
  "Is it being searched?",
  "Does it look clickable?",
  "Is it specific instead of generic junk?",
];

const redFlags = [
  "Generic products like mug, shirt, cup, markers with no angle",
  "Ugly or cluttered product images",
  "No clear niche or use case",
  "Product first, then hope it works",
];

const packagingFormats = [
  "Use case: Best tumblers for keeping drinks cold all day",
  "Aesthetic: Cute aesthetic tumblers you'll actually use daily",
  "Problem solving: Tumblers that don't leak in your bag",
  "Lifestyle: Cozy desk setup essentials",
];

export default function AffiliateEnginePage() {
  return (
    <div className="min-h-screen bg-black font-mono text-orange-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AppTopNav />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-orange-500/40 bg-gradient-to-br from-orange-950/80 via-black to-red-950/50 p-6 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            <p className="text-xs uppercase tracking-[0.35em] text-orange-300/80">
              Affiliate Engine
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-orange-100 md:text-5xl">
              Search -&gt; Product -&gt; Post
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-100/80 md:text-base">
              This lane is for faster, search-driven Amazon content. The goal is not to make every
              post precious. The goal is to consistently pick products that are already showing
              demand, already look clickable, and can turn into high-volume Pinterest or Facebook
              affiliate posts.
            </p>

            <div className="mt-6 rounded-2xl border border-orange-400/40 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-orange-300">Core rule</p>
              <p className="mt-3 text-2xl font-bold text-orange-100">
                Never pick products randomly.
              </p>
              <p className="mt-2 text-lg text-orange-200">
                Always go: <span className="font-black">SEARCH -&gt; PRODUCT -&gt; POST</span>
              </p>
              <p className="mt-3 text-sm text-orange-100/70">
                If this lane flops, the most likely reason is simple: you picked products first
                instead of starting from what people were already searching for.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {signalCards.map((card) => (
                <article
                  key={card.title}
                  className={`rounded-2xl border p-4 ${card.accent}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.28em] opacity-80">
                    {card.eyebrow}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">{card.title}</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6">
                    {card.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-cyan-500/40 bg-cyan-950/15 p-6 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Daily loop</p>
              <ol className="mt-4 space-y-3 text-sm leading-7">
                {dailyLoop.map((step, index) => (
                  <li key={step}>
                    <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/50 text-xs font-bold text-cyan-200">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-3xl border border-lime-500/40 bg-lime-950/15 p-6 text-lime-100 shadow-[0_0_24px_rgba(132,204,22,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-lime-300">Quick check</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {quickChecks.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-lime-200/80">
                If the answer is yes to most of these, it is worth turning into an affiliate post.
              </p>
            </section>

            <section className="rounded-3xl border border-red-500/40 bg-red-950/20 p-6 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-red-300">Skip these</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {redFlags.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-sky-500/40 bg-sky-950/20 p-6 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300">
                Pinterest distribution rule
              </p>
              <p className="mt-4 text-sm leading-7 text-sky-100/85">
                A pin can pass the click test and still fail the distribution test. Pinterest will
                often boost a pin to a small audience first, then reduce reach if it starts to look
                repetitive, too affiliate-heavy, low-context, or visually unoriginal.
              </p>
              <p className="mt-4 text-sm font-bold text-sky-200">
                Every pin must feel like content, not a listing.
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                <li>- Do not lead with a raw product listing angle.</li>
                <li>- Add context, use case, niche, or aesthetic framing.</li>
                <li>- Avoid repeating the same image treatment and wording.</li>
                <li>- Repackage winners with a new angle, image, and keyword.</li>
              </ul>
            </section>

            <section className="rounded-3xl border border-violet-500/40 bg-violet-950/20 p-6 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">
                Better affiliate packaging
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {packagingFormats.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-violet-100/80">
                If something gets clicks but later gets suppressed, keep the product idea and change
                the packaging. New angle, new image, new keyword.
              </p>
            </section>

            <section className="rounded-3xl border border-fuchsia-500/40 bg-fuchsia-950/15 p-6 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300">
                Why this page exists
              </p>
              <p className="mt-4 text-sm leading-7 text-fuchsia-100/85">
                Brand posts and affiliate posts do not obey the same rules. Brand posts are slower,
                more reusable, and tied to your own product universe. Affiliate posts are faster,
                more disposable, and should be driven by search demand. Keeping this logic in its
                own lane prevents the whole system from getting mushy.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
