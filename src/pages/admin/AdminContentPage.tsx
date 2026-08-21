import { BookMarked, CheckCircle2, Database, FileSearch, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const sources = [
  {
    title: "CBSE public curriculum taxonomy",
    publisher: "CBSE",
    chunks: 168,
    licence: "Public metadata / alignment only",
    updated: "20 Aug 2026",
    status: "ready"
  },
  {
    title: "ChalkBox original activity bank",
    publisher: "Team HarshLabs",
    chunks: 94,
    licence: "Original project content",
    updated: "21 Aug 2026",
    status: "ready"
  },
  {
    title: "DIKSHA OER sample catalogue",
    publisher: "DIKSHA contributors",
    chunks: 36,
    licence: "Per-resource attribution retained",
    updated: "19 Aug 2026",
    status: "review"
  }
];

export function AdminContentPage() {
  return (
    <div>
      <PageHeader
        eyebrow="RAG provenance"
        title="Curriculum content"
        description="Only original or appropriately licensed content enters retrieval. Source, URL, licence and attribution travel with every chunk."
        actions={
          <>
            <Badge tone="purple">Simulated data</Badge>
            <Button onClick={() => toast.info("Ingestion is disabled in the public demo.")}>
              <Plus className="size-4" />
              Add source
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden">
          <div className="border-b border-black/5 p-5">
            <h2 className="font-black">Indexed sources</h2>
            <p className="text-muted mt-1 text-xs">
              768-dimensional Gemini embeddings · cosine similarity
            </p>
          </div>
          <div className="divide-y divide-black/5">
            {sources.map((source) => (
              <div key={source.title} className="p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex gap-3">
                    <span className="bg-moss-100 text-moss-700 grid size-10 shrink-0 place-items-center rounded-xl">
                      <BookMarked className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black">{source.title}</h3>
                      <p className="text-muted mt-1 text-xs">
                        {source.publisher} · {source.licence}
                      </p>
                      <p className="text-ink-500 mt-2 text-[11px] font-bold">
                        {source.chunks} chunks · refreshed {source.updated}
                      </p>
                    </div>
                  </div>
                  <Badge tone={source.status === "ready" ? "green" : "amber"}>
                    {source.status === "ready" ? "Indexed" : "Needs review"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <aside className="space-y-4">
          <Card className="p-5">
            <Database className="text-moss-700 size-5" />
            <p className="mt-4 text-2xl font-black">298</p>
            <p className="text-muted text-xs font-bold">Approved retrieval chunks</p>
          </Card>
          <Card className="p-5">
            <FileSearch className="text-moss-700 size-5" />
            <p className="mt-4 text-2xl font-black">100%</p>
            <p className="text-muted text-xs font-bold">Attribution metadata complete</p>
          </Card>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => toast.success("Provenance check complete")}
          >
            <RefreshCw className="size-4" />
            Validate sources
          </Button>
        </aside>
      </div>
      <Card className="mt-5 border-blue-200 bg-blue-50 p-5">
        <div className="flex gap-3">
          <CheckCircle2 className="size-5 shrink-0 text-blue-700" />
          <p className="text-sm leading-6 text-blue-950">
            <strong>Copyright boundary:</strong> NCERT/CBSE names may be used for taxonomy and
            alignment, but substantial textbook prose is not stored or reproduced. Imported OER
            content must carry its exact licence and attribution.
          </p>
        </div>
      </Card>
    </div>
  );
}
