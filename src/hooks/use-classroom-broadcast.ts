import { useEffect, useState } from "react";
import type { PresentationBroadcastState } from "@/lib/classroom-engine";
import { presentationStorageKey } from "@/lib/classroom-engine";

const channelName = "chalkbox-classroom-presenter";

export function publishPresentationState(state: PresentationBroadcastState) {
  const serialized = JSON.stringify(state);
  localStorage.setItem(presentationStorageKey(state.planId), serialized);
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(state);
    channel.close();
  }
  window.dispatchEvent(new CustomEvent(channelName, { detail: state }));
}

function readPresentationState(planId: string) {
  try {
    const value = localStorage.getItem(presentationStorageKey(planId));
    return value ? (JSON.parse(value) as PresentationBroadcastState) : null;
  } catch {
    return null;
  }
}

export function usePresentationState(planId: string | undefined) {
  const [state, setState] = useState<PresentationBroadcastState | null>(() =>
    planId ? readPresentationState(planId) : null
  );
  useEffect(() => {
    if (!planId) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === presentationStorageKey(planId) && event.newValue) {
        setState(JSON.parse(event.newValue) as PresentationBroadcastState);
      }
    };
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<PresentationBroadcastState>).detail;
      if (detail.planId === planId) setState(detail);
    };
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent<PresentationBroadcastState>) => {
        if (event.data.planId === planId) setState(event.data);
      };
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(channelName, onCustom);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(channelName, onCustom);
    };
  }, [planId]);
  return state?.planId === planId ? state : null;
}
