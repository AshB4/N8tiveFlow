import AppTopNav from "../Components/AppTopNav";
import { Link } from "react-router-dom";

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
  "Run the 3-signal check before doing anything else.",
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

const signalRule = [
  {
    title: "Pinterest",
    eyebrow: "Demand",
    body: "Trending keywords, autocomplete, and trend dashboards tell you people are already looking for it.",
  },
  {
    title: "Amazon",
    eyebrow: "Buying",
    body: "Movers & Shakers, Best Sellers, and review velocity tell you people are already buying it.",
  },
  {
    title: "Google",
    eyebrow: "Validation",
    body: "Autocomplete and best-X-for-Y style searches confirm broader demand outside Pinterest.",
  },
];

const timingBuckets = [
  "Evergreen: always-searched needs like markers, desk setup, self-care, planners",
  "Seasonal: spring, summer, fall, winter cycles you can reuse every year",
  "Life events: prom, weddings, graduation, baby shower, moving, new job",
  "Holidays: Christmas, Halloween, Valentine's Day, Mother's Day, Father's Day",
];

const lazyLoop = [
  "Pick 1 category.",
  "Pick 3 keywords.",
  "Match 1-3 products fast.",
  "Generate posts from a fixed formula.",
  "Schedule and move on.",
];

const saleModeRules = [
  "Increase output during Amazon sale windows to 5-8 posts per day max.",
  "Bias toward buying-intent content, not broad branding content.",
  "Do not spam duplicates during the sale.",
  "After the sale ends, drop back to the normal baseline of about 3 posts per day.",
  "Track Amazon sale days so the volume lift is intentional instead of random.",
];

const batchModeRules = [
  "Pick one niche block per session, not random unrelated products.",
  "Generate 20-30 items in one sitting when the pattern is obvious.",
  "Batch by niche, then vary the keyword and angle for each post.",
  "Load the finished set into /batch and let the schedule spread it out.",
  "Do not batch the exact same product angle repeatedly.",
];

const angleStack = [
  "Use case: best X for Y",
  "Aesthetic: cute, cozy, goth, clean, pastel, minimal",
  "Problem: won't leak, stays cold, saves space, actually works",
  "Lifestyle: desk setup, morning routine, self-care night, travel",
  "Comparison / curated: best, top, favorite, must-have",
];

const breakpoints = [
  "Weak search inputs: vague keywords collapse everything downstream.",
  "Lazy product matching: technically relevant is not enough if the image is not clickable.",
  "Repetitive packaging: right product, wrong repeated presentation still gets suppressed.",
];

const winnerRules = [
  "When a pin shows traction, identify the keyword, angle, and product type.",
  "Create 3-5 variations immediately while the pattern is still clear.",
  "Keep the winning product idea, then vary angle, image, context, or title.",
  "Track winners only. Do not waste time logging every dead pin.",
];

const needMoreInfo = [
  "What counts as a winner threshold for you: views, saves, or clicks?",
  "How should angle-based tracking links be stored in the app later?",
  "Which Amazon sale days or event windows should be preloaded into the system?",
  "Do you want one affiliate queue or separate queues by niche block?",
  "When should a winner clone automatically trigger versus staying manual?",
];

const v1Shape = {
  keyword: "string",
  angle: "string",
  productLink: "string",
};

const searchPromptTemplate = `You are a Pinterest + Amazon affiliate strategist.

Goal:
Find the top 10 MOST clickable Easter-related product opportunities using a SEARCH -> PRODUCT -> POST system.

Rules:

1. Start with SEARCH, not products.
- Generate 15-20 real Pinterest-style search phrases related to Easter.
- Focus on high-intent, aesthetic, or problem-solving queries.
- Avoid generic phrases like "Easter items" or "Easter gifts".

2. Validate demand using 3-signal thinking:
- Pinterest intent (searchable, aesthetic, trendable)
- Amazon intent (likely best sellers, movers, or review-heavy categories)
- Optional Google-style intent (best X for Y type searches)

3. From those, select the BEST 10 keyword opportunities.

4. For each keyword:
- Recommend 1-3 specific product types (not random products, but categories that convert)
- Explain WHY it would get clicks (visual, identity, use case)
- Suggest 3 angle variations for Pinterest posts

5. Prioritize:
- Highly visual products
- Strong aesthetic categories (cozy, cute, pastel, bunny-core, spring decor)
- Problem-solving or use-case driven products
- Products that can be repackaged into lists (top 5, best of, etc.)

6. Avoid:
- Generic low-click items
- Products with weak visuals
- One-off novelty items with no reuse potential

Output format:

Keyword:
Why it works:
Product types:
Angle ideas:

Keep it tight, practical, and focused on what would actually get clicks and saves.`;

export default function AffiliateEnginePage() {
  return (
    <div className="min-h-screen bg-black font-mono text-orange-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AppTopNav />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-orange-500/40 bg-gradient-to-br from-orange-950/80 via-black to-red-950/50 p-6 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
              <p className="text-xs uppercase tracking-[0.35em] text-orange-300/80">
                Affiliate Engine
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-orange-100 md:text-5xl">
                Search -&gt; Product -&gt; Post
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-100/80 md:text-base">
                This lane is for faster, search-driven Amazon content. The goal is not to make
                every post precious. The goal is to consistently pick products that are already
                showing demand, already look clickable, and can turn into high-volume Pinterest or
                Facebook affiliate posts.
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

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://affiliate-program.amazon.com/home"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-orange-400/60 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100 transition hover:bg-orange-400 hover:text-black"
                >
                  Open Amazon Associates
                </a>
                <Link
                  to="/affiliate/builder"
                  className="inline-flex items-center rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400 hover:text-black"
                >
                  Open Batch Builder
                </Link>
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

            <section className="rounded-3xl border border-teal-500/40 bg-teal-950/15 p-6 text-teal-100 shadow-[0_0_24px_rgba(20,184,166,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-teal-300">
                Planning kernel
              </p>
              <p className="mt-4 text-sm leading-7 text-teal-100/85">
                This is the compact rule set worth feeding back into GPT later when you want help
                planning the affiliate lane without rereading all the notes.
              </p>
              <div className="mt-4 rounded-2xl border border-teal-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-teal-200">Selection framework</p>
                <ul className="mt-2 space-y-2">
                  <li>- Search -&gt; Product -&gt; Post</li>
                  <li>- Use the 3-signal rule before posting.</li>
                  <li>- Ask: is it searched, clickable, specific, and visually strong?</li>
                  <li>- If it looks like a listing, repackage it.</li>
                </ul>
              </div>
              <div className="mt-4 rounded-2xl border border-teal-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-teal-200">Operating rules</p>
                <ul className="mt-2 space-y-2">
                  <li>- Speed &gt; perfection</li>
                  <li>- Consistency &gt; creativity</li>
                  <li>- Minimum decisions, maximum output</li>
                  <li>- Reuse winners with a new angle, image, and keyword</li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-rose-500/40 bg-rose-950/20 p-6 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-rose-300">Timing buckets</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {timingBuckets.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-rose-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-rose-200">Default mix</p>
                <p>40% evergreen / 30% seasonal / 20% life events / 10% holidays</p>
              </div>
            </section>

            <section className="rounded-3xl border border-yellow-500/40 bg-yellow-950/20 p-6 text-yellow-100 shadow-[0_0_24px_rgba(234,179,8,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-yellow-300">Amazon sale mode</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {saleModeRules.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-yellow-200">Operational note</p>
                <p>
                  Keep a visible list of Amazon sale windows and Prime-style events so posting
                  cadence can ramp up on purpose, then cool back down after the event ends.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-blue-500/40 bg-blue-950/20 p-6 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-blue-300">Batch mode</p>
              <p className="mt-4 text-sm leading-7 text-blue-100/85">
                Think in monthly loads, not daily panic. The goal is to make decisions in chunks,
                then let PostPunk execute the schedule.
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {batchModeRules.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-blue-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-blue-200">Default math</p>
                <p>3 posts/day x 30 days = 90 posts/month baseline</p>
                <p className="mt-2">
                  Same niche, different search intents. Not the same product angle copied 10 times.
                </p>
              </div>
              <div className="mt-4 rounded-2xl border border-blue-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-blue-200">Sale-window math</p>
                <p>25th-30th at 6/day = 36 sale posts</p>
                <p>Remaining 24 days at 3/day = 72 normal posts</p>
                <p>Total = 108 posts for the month, or about 18 extra above baseline.</p>
              </div>
              <div className="mt-4 rounded-2xl border border-blue-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-blue-200">Niche batch math</p>
                <p>1 niche x 3 keywords x 3 products x 5 angles = 45 posts in one session.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-green-500/40 bg-green-950/20 p-6 text-green-100 shadow-[0_0_24px_rgba(34,197,94,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-green-300">Tracking reality</p>
              <p className="mt-4 text-sm leading-7 text-green-100/85">
                Views are signal, not proof. Pinterest views tell you distribution happened. They
                do not guarantee clicks or Amazon conversions.
              </p>
              <div className="mt-4 rounded-2xl border border-green-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-green-200">Use now</p>
                <ul className="mt-2 space-y-2">
                  <li>- views + saves + gut check for early signal</li>
                  <li>- high-intent titles usually imply stronger click potential</li>
                  <li>- unique links per angle group are the first serious upgrade</li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-orange-500/40 bg-orange-950/20 p-6 text-orange-100 shadow-[0_0_24px_rgba(249,115,22,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-orange-300">V1 build shape</p>
              <p className="mt-4 text-sm leading-7 text-orange-100/85">
                Build an angle multiplier, not an affiliate dashboard. Keep the first version
                small enough that it accelerates posting instead of adding admin work.
              </p>
              <div className="mt-4 rounded-2xl border border-orange-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-orange-200">Minimal metadata</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-orange-100/85">
{JSON.stringify(v1Shape, null, 2)}
                </pre>
              </div>
              <div className="mt-4 rounded-2xl border border-orange-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-orange-200">Architecture</p>
                <p className="mt-2">Input: keyword + product</p>
                <p>Process: generate angles -&gt; generate posts -&gt; schedule</p>
                <p>Output: volume + variation</p>
                <p>Feedback: manual observation -&gt; mark winner -&gt; clone later</p>
              </div>
              <p className="mt-4 text-sm text-orange-100/80">
                If a field does not affect posting or cloning, do not store it yet.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-500/40 bg-slate-950/30 p-6 text-slate-100 shadow-[0_0_24px_rgba(148,163,184,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-300">GPT search prompt</p>
              <p className="mt-4 text-sm leading-7 text-slate-100/80">
                Use this when you want GPT to help find stronger product opportunities before you
                build the batch.
              </p>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-slate-400/30 bg-black/30 p-4 text-xs leading-6 text-slate-100/90">
                {searchPromptTemplate}
              </pre>
              <div className="mt-4 rounded-2xl border border-slate-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-slate-200">Seasonal rule</p>
                <p className="mt-2">
                  Do not run a holiday as one giant niche. Break it into reusable micro-niches.
                </p>
                <ul className="mt-3 space-y-2">
                  <li>- gifts</li>
                  <li>- outfits</li>
                  <li>- decor</li>
                  <li>- self-care / beauty</li>
                  <li>- hosting / table / party setup</li>
                </ul>
                <p className="mt-3 text-slate-100/80">
                  That keeps the prompt reusable across Easter, Halloween, Christmas, Valentine's
                  Day, Mother's Day, graduation, and other event-driven windows.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-purple-500/40 bg-purple-950/20 p-6 text-purple-100 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-purple-300">Angle stack</p>
              <p className="mt-4 text-sm leading-7 text-purple-100/85">
                The real engine is Search -&gt; Product -&gt; Angle Stack -&gt; Posts.
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {angleStack.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </section>
          </div>

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

            <section className="rounded-3xl border border-emerald-500/40 bg-emerald-950/15 p-6 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
                Signal stacking system
              </p>
              <p className="mt-4 text-sm leading-7 text-emerald-100/85">
                Do not post off one weak hint. Stack signals first. A product is worth posting when
                it hits at least <span className="font-bold text-emerald-200">2 of these 3</span>.
              </p>
              <div className="mt-4 space-y-3">
                {signalRule.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-emerald-400/30 bg-black/25 p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85">
                      {item.eyebrow}
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-100">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/80">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-black/35 p-4 text-sm leading-7">
                <p>
                  <span className="font-bold text-emerald-200">2+ signals</span> = post
                </p>
                <p>
                  <span className="font-bold text-yellow-300">1 signal</span> = risky
                </p>
                <p>
                  <span className="font-bold text-red-300">0 signals</span> = skip
                </p>
              </div>
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

            <section className="rounded-3xl border border-amber-500/40 bg-amber-950/20 p-6 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
                Cluster upgrade
              </p>
              <p className="mt-4 text-sm leading-7 text-amber-100/85">
                Think in clusters, not single products. One product can work, but curated sets
                often click harder and feel less like raw affiliate spam.
              </p>
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="text-amber-200">Weak:</p>
                <p>1 tumbler</p>
                <p className="mt-3 text-amber-200">Stronger:</p>
                <p>Best tumblers for iced coffee - 3 to 5 options</p>
              </div>
              <p className="mt-4 text-sm text-amber-100/80">
                Clustered content usually saves and clicks better than a single isolated product.
              </p>
            </section>

            <section className="rounded-3xl border border-indigo-500/40 bg-indigo-950/20 p-6 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">Lazy loop</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {lazyLoop.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-indigo-100/80">
                The goal is not to invent a new method every day. The goal is to run the same
                simple loop without burning energy on extra decisions.
              </p>
            </section>

            <section className="rounded-3xl border border-emerald-500/40 bg-emerald-950/15 p-6 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Winner extraction</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {winnerRules.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-emerald-200">Core strategy</p>
                <p>Find demand -&gt; match product -&gt; test angles -&gt; double down on winners.</p>
              </div>
              <p className="mt-4 text-sm text-emerald-100/80">
                When something hits, keep working the niche before moving on too fast.
              </p>
            </section>

            <section className="rounded-3xl border border-red-400/40 bg-red-950/20 p-6 text-red-100 shadow-[0_0_24px_rgba(248,113,113,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-red-300">Where this breaks</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {breakpoints.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-red-100/80">
                If this fails, the most likely cause is still bad search-to-product matching.
              </p>
            </section>

            <section className="rounded-3xl border border-stone-500/40 bg-stone-950/30 p-6 text-stone-100 shadow-[0_0_24px_rgba(168,162,158,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-stone-300">Need more info before automating</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                {needMoreInfo.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
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
