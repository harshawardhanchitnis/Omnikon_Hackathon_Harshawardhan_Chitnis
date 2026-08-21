import { describe, expect, it } from "vitest";
import { getSpeechRecognitionConstructor, speechErrorMessage } from "./use-speech-recognition";

describe("voice brief support", () => {
  it("returns a clear unsupported-browser fallback", () => {
    expect(getSpeechRecognitionConstructor()).toBeNull();
  });

  it("maps permission and offline failures to typing-first recovery", () => {
    expect(speechErrorMessage("not-allowed")).toContain("permission");
    expect(speechErrorMessage("network")).toContain("Typing");
  });
});
