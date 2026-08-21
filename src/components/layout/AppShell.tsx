import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  Command,
  Home,
  Library,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { OfflineBanner } from "./OfflineBanner";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const teacherNav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/plans/new", label: "Create plan", icon: Sparkles },
  { to: "/library", label: "My library", icon: Library },
  { to: "/community", label: "Community", icon: Users },
  { to: "/analytics", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings }
];

const adminNav = [
  { to: "/admin", label: "Overview", icon: Home },
  { to: "/admin/users", label: "Teachers", icon: Users },
  { to: "/admin/content", label: "Content", icon: BookOpen },
  { to: "/admin/operations", label: "AI operations", icon: ShieldCheck }
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = useAppStore((state) => state.mode);
  const profile = useAppStore((state) => state.profile);
  const notifications = useAppStore((state) => state.notifications);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);
  const signOut = useAppStore((state) => state.signOut);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isAdmin = mode === "admin" || mode === "demo-admin";
  const navItems = isAdmin ? adminNav : teacherNav;
  const unread = notifications.filter((item) => !item.read).length;
  const initials = useMemo(
    () =>
      profile?.fullName
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("") ?? "CB",
    [profile?.fullName]
  );

  useEffect(() => setSidebarOpen(false), [location.pathname, setSidebarOpen]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate("/plans/new");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="bg-paper min-h-screen">
      <OfflineBanner />
      {sidebarOpen && (
        <button
          aria-label="Close menu"
          className="bg-ink-950/40 fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "bg-moss-900 fixed inset-y-0 left-0 z-50 flex w-64 flex-col text-white shadow-2xl transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-18 items-center justify-between border-b border-white/10 px-5">
          <Logo inverse linkTo={isAdmin ? "/admin" : "/dashboard"} />
          <button
            className="grid size-9 place-items-center rounded-xl text-white/75 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
          aria-label={isAdmin ? "Admin navigation" : "Teacher navigation"}
        >
          {isAdmin && (
            <p className="mb-3 px-3 text-[10px] font-black tracking-[0.18em] text-white/45 uppercase">
              Admin workspace
            </p>
          )}
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin" || to === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white",
                  isActive && "text-moss-900 bg-white shadow-lg"
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/8 p-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="size-2 rounded-full bg-emerald-300" /> Offline-ready
            </div>
            <p className="mt-1 text-[11px] leading-5 text-white/55">
              Your current drafts stay on this device.
            </p>
          </div>
          <p className="mt-3 text-center text-[10px] font-bold text-white/35">
            Team HarshLabs · Omnikon 2026
          </p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="bg-paper/88 sticky top-0 z-30 border-b border-black/5 backdrop-blur-xl">
          <div className="flex h-17 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="grid size-10 place-items-center rounded-xl hover:bg-black/5 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <button
              className="text-ink-500 hover:border-moss-500 hidden h-10 min-w-56 items-center gap-2 rounded-xl border border-black/8 bg-white px-3 text-left text-sm shadow-sm transition md:flex"
              onClick={() => navigate("/plans/new")}
            >
              <Command className="size-4" />
              <span className="flex-1">Quick create</span>
              <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              {!isAdmin && (
                <Link to="/plans/new" className="hidden sm:block">
                  <Button size="sm">
                    <Plus className="size-4" /> New plan
                  </Button>
                </Link>
              )}
              <div className="relative">
                <button
                  className="relative grid size-10 place-items-center rounded-xl hover:bg-black/5"
                  onClick={() => setNotificationsOpen((value) => !value)}
                  aria-label={`${unread} unread notifications`}
                >
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="bg-coral-500 absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full text-[9px] font-black text-white">
                      {unread}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="surface shadow-lift absolute top-12 right-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border">
                    <div className="flex items-center justify-between border-b border-black/5 p-4">
                      <h2 className="font-black">Notifications</h2>
                      <Badge tone="green">{unread} new</Badge>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                      {notifications.map((item) => (
                        <button
                          key={item.id}
                          className={cn(
                            "hover:bg-moss-50 w-full rounded-xl p-3 text-left",
                            !item.read && "bg-moss-50/70"
                          )}
                          onClick={() => {
                            markNotificationRead(item.id);
                            setNotificationsOpen(false);
                            if (item.href) navigate(item.href);
                          }}
                        >
                          <p className="text-sm font-bold">{item.title}</p>
                          <p className="text-muted mt-1 text-xs leading-5">{item.body}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-black/5"
                  onClick={() => setProfileOpen((value) => !value)}
                  aria-label="Open profile menu"
                >
                  <span className="bg-sun-500 text-ink-950 grid size-8 place-items-center rounded-lg text-xs font-black">
                    {initials}
                  </span>
                  <ChevronDown className="text-ink-500 hidden size-4 sm:block" />
                </button>
                {profileOpen && (
                  <div className="surface shadow-lift absolute top-12 right-0 z-50 w-64 rounded-2xl border p-2">
                    <div className="px-3 py-2">
                      <p className="text-sm font-black">{profile?.fullName}</p>
                      <p className="text-muted truncate text-xs">{profile?.schoolName}</p>
                    </div>
                    {mode.startsWith("demo") && (
                      <div className="mx-2 my-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800">
                        Demo workspace
                      </div>
                    )}
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="hover:bg-moss-50 mt-1 flex rounded-xl px-3 py-2 text-sm font-bold"
                    >
                      Settings
                    </Link>
                    {mode === "demo-teacher" && (
                      <button
                        className="hover:bg-moss-50 w-full rounded-xl px-3 py-2 text-left text-sm font-bold"
                        onClick={async () => {
                          await useAppStore.getState().enterDemoAdmin();
                          setProfileOpen(false);
                          navigate("/admin");
                        }}
                      >
                        View admin demo
                      </button>
                    )}
                    {mode === "demo-admin" && (
                      <button
                        className="hover:bg-moss-50 w-full rounded-xl px-3 py-2 text-left text-sm font-bold"
                        onClick={async () => {
                          await useAppStore.getState().enterDemo();
                          setProfileOpen(false);
                          navigate("/dashboard");
                        }}
                      >
                        Return to teacher demo
                      </button>
                    )}
                    <button
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"
                      onClick={() => {
                        signOut();
                        void supabase?.auth.signOut();
                        navigate("/");
                      }}
                    >
                      Exit workspace
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-10"
        >
          <Outlet />
        </main>
      </div>

      {!isAdmin && (
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/8 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden"
          aria-label="Mobile navigation"
        >
          {teacherNav.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "text-ink-500 flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-bold",
                  isActive && "text-moss-700"
                )
              }
            >
              <Icon className="size-5" />
              <span className="truncate">{label === "Create plan" ? "Create" : label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
