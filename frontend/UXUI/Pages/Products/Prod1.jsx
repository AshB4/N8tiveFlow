export default function Prod1() {
  return (
    <div className="min-h-screen bg-black text-teal-200 font-mono p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-pink-700 bg-black/70 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-pink-500 mb-3">
          product profile
        </p>
        <h1 className="text-4xl text-pink-400 mb-4">PostPunk Core</h1>
        <p className="text-lg text-teal-300 mb-6">
          The local-first automation engine for drafting, scheduling, and publishing posts across supported platforms.
        </p>

        <div className="space-y-4 text-sm leading-7">
          <p>
            PostPunk Core is the operational layer: queue management, status rules,
            target selection, media upload, and the worker flow that turns approved
            posts into actual platform actions.
          </p>
          <p>
            It is aimed at solo builders and small operators who want control over
            their posting system without locking themselves into a hosted SaaS stack
            too early.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-teal-700 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Focus</p>
            <p className="mt-2 text-pink-300">Queue + scheduler</p>
          </div>
          <div className="rounded border border-teal-700 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Best For</p>
            <p className="mt-2 text-pink-300">Local-first content ops</p>
          </div>
          <div className="rounded border border-teal-700 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Status</p>
            <p className="mt-2 text-pink-300">Active foundation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
