import { CloudOff, Home, Library } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export function OfflinePage() {
  return (
    <main id="main-content" className="paper-grid grid min-h-screen place-items-center px-4">
      <div className="surface shadow-lift w-full max-w-lg rounded-3xl border p-8 text-center">
        <Logo className="justify-center" />
        <span className="mx-auto mt-8 grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          <CloudOff className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-black">You’re offline—not out of options.</h1>
        <p className="text-muted mt-3 text-sm leading-6">
          Open saved lesson plans, continue a draft or capture teaching notes. AI generation and
          cloud sync will return with your connection.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to="/library">
            <Button>
              <Library className="size-4" />
              Open saved plans
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary">
              <Home className="size-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
