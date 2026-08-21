import { PublicHeader } from "@/components/layout/PublicHeader";

export function PrivacyPage() {
  return (
    <div className="bg-paper min-h-screen">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-moss-700 text-xs font-black tracking-[0.18em] uppercase">Trust centre</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Privacy and responsible AI</h1>
        <div className="text-ink-700 mt-9 space-y-8 text-sm leading-7">
          <section>
            <h2 className="text-ink-950 text-lg font-black">What ChalkBox stores</h2>
            <p className="mt-2">
              Teacher profile details, lesson plans, teaching-session notes, reflections and product
              settings. Offline drafts are stored in the browser on the teacher’s device. Registered
              accounts may sync these records to Supabase.
            </p>
          </section>
          <section>
            <h2 className="text-ink-950 text-lg font-black">What ChalkBox does not need</h2>
            <p className="mt-2">
              The core product does not request student names, phone numbers, identifiers,
              marksheets or photographs. Teachers should never enter student personal information
              into plan prompts or notes.
            </p>
          </section>
          <section>
            <h2 className="text-ink-950 text-lg font-black">How AI is used</h2>
            <p className="mt-2">
              Lesson-generation requests travel through a protected server function. Gemini
              credentials never enter the browser. Generated plans are schema-validated,
              quality-checked and labelled. The teacher remains responsible for curriculum fit,
              factual review, safety and classroom use.
            </p>
          </section>
          <section>
            <h2 className="text-ink-950 text-lg font-black">Demo transparency</h2>
            <p className="mt-2">
              The public demo uses a fictional teacher persona and prepared records. Prepared plans
              are labelled and never represented as live AI output. Demo data can be reset from
              Settings.
            </p>
          </section>
          <section>
            <h2 className="text-ink-950 text-lg font-black">Curriculum and attribution</h2>
            <p className="mt-2">
              ChalkBox may align to public CBSE/NCERT taxonomies and approved open educational
              resources. It does not copy substantial textbook prose. Sources retain publisher, URL,
              licence and attribution metadata.
            </p>
          </section>
          <p className="text-muted border-t border-black/8 pt-5 text-xs">
            Prototype privacy notice · Team HarshLabs · Last updated 21 August 2026
          </p>
        </div>
      </main>
    </div>
  );
}
