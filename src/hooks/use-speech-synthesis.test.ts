import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSpeechSynthesis } from "./use-speech-synthesis";

describe("useSpeechSynthesis", () => {
  it("exposes a safe unsupported fallback", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(typeof result.current.supported).toBe("boolean");
    expect(() => result.current.speak("Read this")).not.toThrow();
    expect(() => result.current.stop()).not.toThrow();
  });
});
