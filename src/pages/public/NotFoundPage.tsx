import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="paper-grid grid min-h-screen place-items-center px-4 text-center"
    >
      <div>
        <Logo className="justify-center" />
        <p className="text-moss-100 mt-10 text-7xl font-black tracking-tighter">404</p>
        <h1 className="-mt-3 text-3xl font-black tracking-tight">This page missed the bell.</h1>
        <p className="text-muted mt-3 text-sm">The link may be old, or the page may have moved.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>
            <ArrowLeft className="size-4" />
            Return home
          </Button>
        </Link>
        <p className="text-moss-700 mt-6 flex items-center justify-center gap-1 text-xs font-bold">
          <Sparkles className="size-3.5" />
          Your saved plans are unaffected.
        </p>
      </div>
    </main>
  );
}
