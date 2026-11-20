import type { GenerateGridRequest, GenerateGridResult, ImageProvider } from "./types";

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parseDataUrl(dataUrl: string): { bytes: Uint8Array; mimeType: "image/png" | "image/webp" } | null {
  const match = dataUrl.match(/^data:(image\/(?:png|webp|jpeg));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] === "image/webp" ? "image/webp" : "image/png";
  return { bytes: decodeBase64(match[2]), mimeType: mime };
}

/**
 * OpenAI-compatible & OpenRouter multimodal image generation relay adapter.
 * Supports chat/completions image outputs (e.g. OpenRouter Gemini 3 Pro Image)
 * and falls back cleanly if a URL or base64 payload is returned.
 */
export class OpenAIRelayImageProvider implements ImageProvider {
  readonly name = "openai-relay";

  async generateGrid(req: GenerateGridRequest): Promise<GenerateGridResult> {
    const apiBase = (process.env.AI_IMAGE_API_BASE || "https://openrouter.ai/api/v1").replace(
      /\/$/,
      ""
    );
    const apiKey = process.env.AI_IMAGE_API_KEY;
    const model = process.env.AI_IMAGE_MODEL || "google/gemini-3-pro-image-preview";

    if (!apiKey) {
      throw new Error("AI_IMAGE_API_KEY is not configured for openai-relay provider");
    }

    const contentParts: Array<Record<string, unknown>> = [{ type: "text", text: req.prompt }];
    for (const ref of req.referenceImages) {
      contentParts.push({
        type: "image_url",
        image_url: { url: ref.url },
      });
    }

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: req.aspectRatio,
          image_size: req.resolution,
        },
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`OpenAI relay failed (${response.status}): ${errText.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      id?: string;
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
          content?: string | Array<{ type?: string; image_url?: { url?: string } }>;
        };
      }>;
    };

    const message = payload.choices?.[0]?.message;
    let imageUrl: string | undefined = message?.images?.[0]?.image_url?.url;

    if (!imageUrl && Array.isArray(message?.content)) {
      const imgPart = message.content.find((p) => p.image_url?.url);
      imageUrl = imgPart?.image_url?.url;
    }

    if (!imageUrl && typeof message?.content === "string") {
      const dataMatch = message.content.match(/data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+/);
      if (dataMatch) {
        imageUrl = dataMatch[0];
      } else {
        const urlMatch = message.content.match(/https?:\/\/[^\s)"']+/);
        if (urlMatch) imageUrl = urlMatch[0];
      }
    }

    if (!imageUrl) {
      throw new Error("AI relay response did not contain a generated image");
    }

    const parsedData = parseDataUrl(imageUrl);
    if (parsedData) {
      return {
        imageBytes: parsedData.bytes,
        mimeType: parsedData.mimeType,
        providerJobId: payload.id,
      };
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch generated image from relay URL (${imgRes.status})`);
    }
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const buf = new Uint8Array(await imgRes.arrayBuffer());

    return {
      imageBytes: buf,
      mimeType: contentType.includes("webp") ? "image/webp" : "image/png",
      providerJobId: payload.id,
    };
  }
}
