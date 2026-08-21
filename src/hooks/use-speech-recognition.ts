import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function getSpeechRecognitionConstructor(target: Window = window) {
  const speechWindow = target as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function speechErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone permission was denied. You can continue by typing your brief.";
  }
  if (error === "no-speech") return "No speech was detected. Try again or type your brief.";
  if (error === "network") return "Voice recognition is unavailable offline. Typing still works.";
  return "Voice input stopped unexpectedly. Your typed brief is still available.";
}

export function useSpeechRecognition(
  onTranscript: (transcript: string) => void,
  language: "en-IN" | "hi-IN" = "en-IN"
) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const supported = typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor());

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    setError("");
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError("Voice input is not supported in this browser. You can type your brief instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }
      if (transcript.trim()) onTranscript(transcript.trim());
    };
    recognition.onerror = (event) => {
      setError(speechErrorMessage(event.error));
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Voice input could not start. You can type your brief instead.");
    }
  }, [language, onTranscript]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
