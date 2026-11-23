import { Buffer } from "node:buffer";
import type {
  GenerateAssetRequest,
  GenerateGridRequest,
  GenerateGridResult,
  ImageProvider,
  ReferenceImageInput,
} from "./types";

function decodeBase64(b64: string): Uint8Array {
  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Native Google Gemini Image Generation API (or compatible Gemini relay) adapter.
 * Supports 4K 1:1 native generation, store assets, and multi-image references via inlineData.
 */
export class GeminiRelayImageProvider implements ImageProvider {
  readonly name = "gemini-relay";

  private async generateWithConfig(params: {
    signal?: AbortSignal;
    prompt: string;
    aspectRatio: string;
    resolution: string;
    referenceImages: ReferenceImageInput[];
  }): Promise<GenerateGridResult> {
    const apiBase = (
      process.env.AI_IMAGE_API_BASE || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    const apiKey = process.env.AI_IMAGE_API_KEY;
    const model = process.env.AI_IMAGE_MODEL || "gemini-3-pro-image-preview";

    if (!apiKey) {
      throw new Error("AI_IMAGE_API_KEY is not configured for gemini-relay provider");
    }

    const rasterRefs = params.referenceImages.filter(
      (ref) => ref.image.type && ref.image.type !== "image/svg+xml"
    );
    const refParts = await Promise.all(
      rasterRefs.map(async (ref) => ({
        inlineData: {
          mimeType: ref.image.type,
          data: Buffer.from(await ref.image.arrayBuffer()).toString("base64"),
        },
      }))
    );
    const parts: Array<Record<string, unknown>> = [{ text: params.prompt }, ...refParts];

    const endpoint = `${apiBase}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      signal: params.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: params.aspectRatio,
            imageSize: params.resolution,
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

  async generateGrid(req: GenerateGridRequest): Promise<GenerateGridResult> {
    return this.generateWithConfig(req);
  }

  async generateAsset(req: GenerateAssetRequest): Promise<GenerateGridResult> {
    return this.generateWithConfig(req);
  }
}
