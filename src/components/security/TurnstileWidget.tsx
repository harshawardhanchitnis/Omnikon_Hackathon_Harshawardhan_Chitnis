import { useEffect, useId, useRef } from "react";
import { appConfig } from "@/lib/config";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onToken, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const id = useId();
  useEffect(() => {
    if (!appConfig.turnstileSiteKey) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetRef.current) return;
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: appConfig.turnstileSiteKey,
        callback: onToken,
        "expired-callback": () => {
          onToken("");
          onExpire?.();
        },
        theme: "light",
        size: "flexible"
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-chalkbox-turnstile="true"]'
    );
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.chalkboxTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.append(script);
    }
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [onExpire, onToken]);
  if (!appConfig.turnstileSiteKey) return null;
  return (
    <div
      id={id}
      ref={containerRef}
      className="min-h-16 overflow-hidden rounded-xl"
      aria-label="Human verification"
    />
  );
}
