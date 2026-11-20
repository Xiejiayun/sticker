/**
 * Optional LLM prompt enhancer.
 * Translates casual Chinese/English user descriptions into concise visual traits
 * for stronger character consistency across grid cells.
 * Falls back to the original description whenever disabled or on any error.
 */
export async function enhanceSubjectDescription(rawDescription: string): Promise<string> {
  const trimmed = rawDescription.trim();
  if (!trimmed) return "";

  const enabled = process.env.LLM_ENHANCE_ENABLED === "true";
  const apiKey = process.env.LLM_ENHANCE_API_KEY;
  const apiBase = (process.env.LLM_ENHANCE_API_BASE || "https://openrouter.ai/api/v1").replace(
    /\/$/,
    ""
  );
  const model = process.env.LLM_ENHANCE_MODEL || "google/gemini-2.5-flash";

  if (!enabled || !apiKey) {
    return trimmed;
  }

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              "You convert a user's short character/pet description into a concise English visual sheet (2-3 sentences max) covering species/gender, hairstyle/fur, outfit, key accessories, and color palette. Do NOT mention art style, background, or sticker layout. Output only the visual description.",
          },
          {
            role: "user",
            content: trimmed,
          },
        ],
      }),
    });

    if (!response.ok) {
      return trimmed;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const enhanced = data.choices?.[0]?.message?.content?.trim();
    return enhanced || trimmed;
  } catch (err) {
    console.warn("[prompt-enhancer] Falling back to raw description:", err);
    return trimmed;
  }
}
