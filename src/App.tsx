function App() {
  return (
    <main className="min-h-screen bg-[var(--chalkbox-cream)]">
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl rounded-[32px] border border-[var(--chalkbox-border)] bg-[var(--chalkbox-paper)] p-8 shadow-[0_24px_80px_rgba(16,58,38,0.10)] sm:p-12">
          <div className="flex flex-col items-center text-center">
            <img
              src="/branding/logo.png"
              alt="ChalkBox by HarshLabs AI"
              className="mb-10 w-full max-w-[420px]"
            />

            <span className="mb-5 rounded-full border border-[#cbdccc] bg-[#eef5ec] px-4 py-2 text-sm font-semibold text-[#176b43]">
              ChalkBox Rebuild
            </span>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#17211b] sm:text-5xl">
              Your classroom. Your plan.
              <span className="block text-[#0f5132]">
                Powered by HarshLabs AI.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--chalkbox-text-muted)] sm:text-lg">
              The ChalkBox frontend foundation is ready. React, TypeScript,
              Vite and the new blackboard-green design system are now working
              together.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <div className="rounded-xl bg-[#0f5132] px-5 py-3 text-sm font-semibold text-white">
                Blackboard Green
              </div>

              <div className="rounded-xl border border-[var(--chalkbox-border)] bg-[#f3f7f0] px-5 py-3 text-sm font-semibold text-[#0f5132]">
                Off-white Canvas
              </div>

              <div className="rounded-xl border border-[var(--chalkbox-border)] bg-white px-5 py-3 text-sm font-semibold text-[#17211b]">
                Teacher-first UI
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App