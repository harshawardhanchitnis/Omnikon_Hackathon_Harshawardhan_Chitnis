import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute, ProtectedRoute } from "@/components/layout/RouteGuards";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAppStore } from "@/store/app-store";
import { supabase } from "@/lib/supabase";
import { loadProfileRemote } from "@/services/activity-repository";
import { DomainProvider } from "@/state/domain-context";

const LandingPage = lazy(() =>
  import("@/pages/public/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const DemoBootstrapPage = lazy(() =>
  import("@/pages/public/DemoBootstrapPage").then((m) => ({ default: m.DemoBootstrapPage }))
);
const AuthPage = lazy(() =>
  import("@/pages/public/AuthPage").then((m) => ({ default: m.AuthPage }))
);
const AuthCallbackPage = lazy(() =>
  import("@/pages/public/AuthCallbackPage").then((m) => ({ default: m.AuthCallbackPage }))
);
const AboutPage = lazy(() =>
  import("@/pages/public/AboutPage").then((m) => ({ default: m.AboutPage }))
);
const PrivacyPage = lazy(() =>
  import("@/pages/public/PrivacyPage").then((m) => ({ default: m.PrivacyPage }))
);
const SharedPlanPage = lazy(() =>
  import("@/pages/public/SharedPlanPage").then((m) => ({ default: m.SharedPlanPage }))
);
const OfflinePage = lazy(() =>
  import("@/pages/public/OfflinePage").then((m) => ({ default: m.OfflinePage }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/public/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);
const OnboardingPage = lazy(() =>
  import("@/pages/app/OnboardingPage").then((m) => ({ default: m.OnboardingPage }))
);
const DashboardPage = lazy(() =>
  import("@/pages/app/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const NewPlanPage = lazy(() =>
  import("@/pages/app/NewPlanPage").then((m) => ({ default: m.NewPlanPage }))
);
const PlanEditorPage = lazy(() =>
  import("@/pages/app/PlanEditorPage").then((m) => ({ default: m.PlanEditorPage }))
);
const PlanPreviewPage = lazy(() =>
  import("@/pages/app/PlanPreviewPage").then((m) => ({ default: m.PlanPreviewPage }))
);
const TeachModePage = lazy(() =>
  import("@/pages/app/TeachModePage").then((m) => ({ default: m.TeachModePage }))
);
const PresentModePage = lazy(() =>
  import("@/pages/app/PresentModePage").then((m) => ({ default: m.PresentModePage }))
);
const ReflectionPage = lazy(() =>
  import("@/pages/app/ReflectionPage").then((m) => ({ default: m.ReflectionPage }))
);
const LibraryPage = lazy(() =>
  import("@/pages/app/LibraryPage").then((m) => ({ default: m.LibraryPage }))
);
const CommunityPage = lazy(() =>
  import("@/pages/app/CommunityPage").then((m) => ({ default: m.CommunityPage }))
);
const CommunityDetailPage = lazy(() =>
  import("@/pages/app/CommunityDetailPage").then((m) => ({ default: m.CommunityDetailPage }))
);
const AnalyticsPage = lazy(() =>
  import("@/pages/app/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);
const SettingsPage = lazy(() =>
  import("@/pages/app/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const AssessmentBankPage = lazy(() =>
  import("@/pages/app/AssessmentBankPage").then((m) => ({ default: m.AssessmentBankPage }))
);
const WorksheetBuilderPage = lazy(() =>
  import("@/pages/app/WorksheetBuilderPage").then((m) => ({ default: m.WorksheetBuilderPage }))
);
const ClassroomProfilesPage = lazy(() =>
  import("@/pages/app/ClassroomProfilesPage").then((m) => ({ default: m.ClassroomProfilesPage }))
);
const CurriculumExplorerPage = lazy(() =>
  import("@/pages/app/CurriculumExplorerPage").then((m) => ({ default: m.CurriculumExplorerPage }))
);
const AdminOverviewPage = lazy(() =>
  import("@/pages/admin/AdminOverviewPage").then((m) => ({ default: m.AdminOverviewPage }))
);
const AdminUsersPage = lazy(() =>
  import("@/pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage }))
);
const AdminContentPage = lazy(() =>
  import("@/pages/admin/AdminContentPage").then((m) => ({ default: m.AdminContentPage }))
);
const AdminOperationsPage = lazy(() =>
  import("@/pages/admin/AdminOperationsPage").then((m) => ({ default: m.AdminOperationsPage }))
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } }
});

function AppLifecycle() {
  const mode = useAppStore((state) => state.mode);
  const settings = useAppStore((state) => state.settings);
  const setAuthenticatedProfile = useAppStore((state) => state.setAuthenticatedProfile);
  useEffect(() => {
    const theme =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
    document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "full";
  }, [settings.highContrast, settings.reducedMotion, settings.theme]);
  useEffect(() => {
    if (!supabase || mode !== "guest") return;
    const client = supabase;
    let active = true;
    const restore = async () => {
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!active || !user || user.is_anonymous) return;
      const profile = await loadProfileRemote(user).catch(() => null);
      if (active && profile) setAuthenticatedProfile(profile);
    };
    void restore();
    return () => {
      active = false;
    };
  }, [mode, setAuthenticatedProfile]);
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DomainProvider>
          <AppLifecycle />
          <BrowserRouter>
            <Suspense fallback={<LoadingState />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/demo" element={<DemoBootstrapPage />} />
                <Route path="/share/:slug" element={<SharedPlanPage />} />
                <Route path="/offline" element={<OfflinePage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/plans/:planId/teach" element={<TeachModePage />} />
                  <Route path="/plans/:planId/present" element={<PresentModePage />} />
                  <Route path="/plans/:planId/reflect" element={<ReflectionPage />} />
                  <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/plans/new" element={<NewPlanPage />} />
                    <Route path="/plans/:planId/edit" element={<PlanEditorPage />} />
                    <Route path="/plans/:planId/preview" element={<PlanPreviewPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/assessments" element={<AssessmentBankPage />} />
                    <Route path="/worksheets/:worksheetId" element={<WorksheetBuilderPage />} />
                    <Route path="/classrooms" element={<ClassroomProfilesPage />} />
                    <Route path="/curriculum" element={<CurriculumExplorerPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/community/:communityId" element={<CommunityDetailPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminOverviewPage />} />
                      <Route path="/admin/users" element={<AdminUsersPage />} />
                      <Route path="/admin/content" element={<AdminContentPage />} />
                      <Route path="/admin/operations" element={<AdminOperationsPage />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="top-right" closeButton />
        </DomainProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
