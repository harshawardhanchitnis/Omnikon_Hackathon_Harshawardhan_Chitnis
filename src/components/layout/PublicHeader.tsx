import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/#how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Trust & privacy" }
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-paper/90 sticky top-0 z-40 border-b border-black/5 backdrop-blur-xl">
      <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="text-ink-700 hover:text-moss-700 text-sm font-bold transition"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/demo">
            <Button variant="sun">Try the demo</Button>
          </Link>
        </div>
        <button
          className="grid size-10 place-items-center rounded-xl md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <div
        className={cn("bg-paper border-t border-black/5 px-4 py-4 md:hidden", !open && "hidden")}
      >
        <nav className="flex flex-col gap-1">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="hover:bg-moss-50 rounded-xl px-3 py-2.5 text-sm font-bold"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button variant="secondary" className="w-full">
                Sign in
              </Button>
            </Link>
            <Link to="/demo" onClick={() => setOpen(false)}>
              <Button variant="sun" className="w-full">
                Try demo
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
