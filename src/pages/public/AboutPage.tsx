import { HeartHandshake, Lightbulb, School, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AboutPage() {
  return (
    <div className="bg-paper min-h-screen">
      <PublicHeader />
      <main id="main-content">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-moss-700 text-xs font-black tracking-[0.18em] uppercase">
            Why ChalkBox
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            Teacher time should reach learners—not disappear into formatting.
          </h1>
          <p className="text-muted mx-auto mt-6 max-w-2xl text-lg leading-8">
            ChalkBox is Team HarshLabs’ response to Omni_EdTech_7: fast lesson-planning support for
            teachers in under-resourced schools.
          </p>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            {
              icon: School,
              title: "Start with reality",
              text: "Class size, electricity, language and materials shape the plan."
            },
            {
              icon: Lightbulb,
              title: "Make AI inspectable",
              text: "Structured output, quality checks, sources and disclosures stay visible."
            },
            {
              icon: ShieldCheck,
              title: "Protect learners",
              text: "No student PII is needed for any core workflow."
            },
            {
              icon: HeartHandshake,
              title: "Keep teachers in charge",
              text: "Every plan is editable, exportable and explicitly requires teacher review."
            }
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-5">
              <Icon className="text-moss-700 size-6" />
              <h2 className="mt-5 font-black">{title}</h2>
              <p className="text-muted mt-2 text-sm leading-6">{text}</p>
            </Card>
          ))}
        </section>
        <section className="border-y border-black/5 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-black">Built for Omnikon National Hackathon 2026</h2>
            <p className="text-muted mt-4 leading-7">
              Designed and built by Harshawardhan Chitnis as Team HarshLabs. The product uses
              original ChalkBox lesson content and public curriculum taxonomy for alignment; it does
              not reproduce textbooks.
            </p>
            <Link to="/demo" className="mt-6 inline-block">
              <Button>Explore the demo</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
