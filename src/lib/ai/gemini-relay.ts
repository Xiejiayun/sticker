import type { GenerateGridRequest, GenerateGridResult, ImageProvider } from "./types";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Native Google Gemini Image Generation API (or compatible Gemini relay) adapter.
 * Supports 4K 1:1 native generation and multi-image references via inlineData.
 */
export class GeminiRelayImageProvider implements ImageProvider {
  readonly name = "gemini-relay";

  async generateGrid(req: GenerateGridRequest): Promise<GenerateGridResult> {
    const apiBase = (
      process.env.AI_IMAGE_API_BASE || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    const apiKey = process.env.AI_IMAGE_API_KEY;
    const model = process.env.AI_IMAGE_MODEL || "gemini-3-pro-image-preview";

    if (!apiKey) {
      throw new Error("AI_IMAGE_API_KEY is not configured for gemini-relay provider");
    }

    const parts: Array<Record<string, unknown>> = [{ text: req.prompt }];

    for (const ref of req.referenceImages) {
      if (ref.url.startsWith("data:")) {
        const match = ref.url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      } else {
        const imgRes = await fetch(ref.url);
        if (imgRes.ok) {
          const b64 = arrayBufferToBase64(await imgRes.arrayBuffer());
          parts.push({
            inlineData: {
              mimeType: ref.mimeType || imgRes.headers.get("content-type") || "image/jpeg",
              data: b64,
            },
          });
        }
      }
    }

    const endpoint = `${apiBase}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: req.aspectRatio,
            imageSize: req.resolution,
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Gemini relay failed (${response.status}): ${errText.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { mimeType?: string; data?: string };
          }>;
        };
      }>;
    };

    const imagePart = payload.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      throw new Error("Gemini relay did not return image inlineData");
    }

    const mime = imagePart.inlineData.mimeType?.includes("webp") ? "image/webp" : "image/png";
    return {
      imageBytes: decodeBase64(imagePart.inlineData.data),
      mimeType: mime,
    };
  }
}
