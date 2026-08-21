import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { Logo } from "@/components/brand/Logo";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("ChalkBox render failure", error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="paper-grid grid min-h-screen place-items-center px-4">
        <div className="surface shadow-lift w-full max-w-lg rounded-3xl border p-8 text-center">
          <Logo className="justify-center" />
          <span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-red-50 text-red-700">
            <AlertTriangle className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-black">ChalkBox hit an unexpected error.</h1>
          <p className="text-muted mt-3 text-sm leading-6">
            Your offline plans remain stored. Reload the app to return to the last saved state.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-3 text-left text-xs text-white">
              {this.state.message}
            </pre>
          )}
          <Button className="mt-6" onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" />
            Reload ChalkBox
          </Button>
        </div>
      </main>
    );
  }
}
