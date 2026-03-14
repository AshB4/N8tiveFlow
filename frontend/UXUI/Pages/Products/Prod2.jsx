export default function Prod2() {
  return (
    <div className="min-h-screen bg-black text-teal-200 font-mono p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-pink-700 bg-black/70 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-pink-500 mb-3">
          product profile
        </p>
        <h1 className="text-4xl text-pink-400 mb-4">PostPunk Signals</h1>
        <p className="text-lg text-teal-300 mb-6">
          The measurement layer for understanding which campaigns, platforms, and content loops are actually producing clicks, signups, and conversions.
        </p>

        <div className="space-y-4 text-sm leading-7">
          <p>
            PostPunk Signals is the reporting surface that sits on top of the queue.
            It combines post pipeline data with funnel event files so you can see what
            shipped, what converted, and where the next experiment should go.
          </p>
          <p>
            It is the right place to extend into richer revenue tracking later, but
            even now it gives a usable baseline for campaign decisions instead of just
            counting scheduled posts.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-teal-700 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Focus</p>
            <p className="mt-2 text-pink-300">Funnel visibility</p>
          </div>
          <div className="rounded border border-teal-700 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Best For</p>
            <p className="mt-2 text-pink-300">Campaign review</p>
          </div>
          <div className="rounded border border-teal-700 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Status</p>
            <p className="mt-2 text-pink-300">Live dashboard base</p>
          </div>
        </div>
      </div>
    </div>
  );
}
