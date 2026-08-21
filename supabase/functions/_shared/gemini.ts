import { HttpError } from "./http.ts";

function apiKey() {
  const value = Deno.env.get("GEMINI_API_KEY");
  if (!value) throw new Error("GEMINI_API_KEY is not configured");
  return value;
}

async function geminiFetch(model: string, method: string, body: unknown) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}?key=${encodeURIComponent(apiKey())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000)
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    console.error("Gemini API failure", response.status, detail.slice(0, 500));
    if (response.status === 429)
      throw new HttpError(
        429,
        "The free AI service is busy. Retry shortly or use a saved plan.",
        "AI_RATE_LIMIT"
      );
    throw new HttpError(502, "The AI provider is temporarily unavailable.", "AI_PROVIDER_ERROR");
  }
  return response.json();
}

export async function embedText(text: string): Promise<number[]> {
  const model = Deno.env.get("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-2";
  const dimensions = Number(Deno.env.get("GEMINI_EMBEDDING_DIMENSIONS") ?? "768");
  const data = await geminiFetch(model, "embedContent", {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: dimensions
  });
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== dimensions)
    throw new HttpError(
      502,
      "The curriculum search service returned an invalid embedding.",
      "EMBEDDING_INVALID"
    );
  return values;
}

export async function embedDocument(text: string, title: string): Promise<number[]> {
  const model = Deno.env.get("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-2";
  const dimensions = Number(Deno.env.get("GEMINI_EMBEDDING_DIMENSIONS") ?? "768");
  const data = await geminiFetch(model, "embedContent", {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    title,
    outputDimensionality: dimensions
  });
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== dimensions)
    throw new HttpError(
      502,
      "The source indexer returned an invalid embedding.",
      "EMBEDDING_INVALID"
    );
  return values;
}

export async function generateJson(prompt: string, responseJsonSchema: Record<string, unknown>) {
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.7-flash";
  const data = await geminiFetch(model, "generateContent", {
    systemInstruction: {
      parts: [
        {
          text: "You are ChalkBox, a cautious Indian classroom lesson-planning assistant. Follow the supplied JSON schema exactly. Never invent citations, never request student personal data, and never reproduce substantial textbook prose."
        }
      ]
    },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseJsonSchema
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  });
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("");
  if (!text) throw new HttpError(502, "The AI returned no lesson content.", "AI_EMPTY_RESPONSE");
  return { text, model, usage: data.usageMetadata ?? null };
}
