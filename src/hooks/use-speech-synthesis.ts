import { useCallback, useEffect, useState } from "react";

export interface SpeechSynthesisController {
  supported: boolean;
  speaking: boolean;
  speak: (text: string, language?: "English" | "Hindi" | "Bilingual English–Hindi") => void;
  stop: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisController {
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, language: "English" | "Hindi" | "Bilingual English–Hindi" = "English") => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = language === "Hindi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop };
}
