import { Buffer } from "node:buffer";
import type {
  GenerateAssetRequest,
  GenerateGridRequest,
  GenerateGridResult,
  ImageProvider,
  ReferenceImageInput,
} from "./types";

interface OpenAIImageGenInput {
  signal?: AbortSignal;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  referenceImages: ReferenceImageInput[];
}

function decodeBase64(b64: string): Uint8Array {
  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function parseDataUrl(
  dataUrl: string
): { bytes: Uint8Array; mimeType: "image/png" | "image/webp" } | null {
  const match = dataUrl.match(/^data:(image\/(?:png|webp|jpeg));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] === "image/webp" ? "image/webp" : "image/png";
  return { bytes: decodeBase64(match[2]), mimeType: mime };
}

async function fetchImageFromUrlOrData(
  imageUrl: string,
  providerJobId?: string,
  signal?: AbortSignal
): Promise<GenerateGridResult> {
  const parsedData = parseDataUrl(imageUrl);
  if (parsedData) {
    return {
      imageBytes: parsedData.bytes,
      mimeType: parsedData.mimeType,
      providerJobId,
    };
  }

  const imgRes = await fetch(imageUrl, { signal });
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch generated image from relay URL (${imgRes.status})`);
  }
  const contentType = imgRes.headers.get("content-type") || "image/png";
  const buf = new Uint8Array(await imgRes.arrayBuffer());

  return {
    imageBytes: buf,
    mimeType: contentType.includes("webp") ? "image/webp" : "image/png",
    providerJobId,
  };
}

/**
 * OpenAI-compatible & OpenRouter multimodal image generation relay adapter.
 * Automatically requests true 4K (4096x4096) with graceful size fallback
 * and supports both `/images/generations` + `/images/edits` and `/chat/completions`.
 */
export class OpenAIRelayImageProvider implements ImageProvider {
  readonly name = "openai-relay";

  private async callImagesEndpointOnce(
    apiBase: string,
    apiKey: string,
    model: string,
    size: string,
    req: OpenAIImageGenInput
  ): Promise<GenerateGridResult> {
    let response: Response;

    const quality = process.env.AI_IMAGE_QUALITY?.trim() || "auto";

    if (req.referenceImages.length > 0) {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", req.prompt);
      form.append("size", size);
      if (quality !== "auto") {
        form.append("quality", quality);
      }
      form.append("n", "1");

      for (let i = 0; i < req.referenceImages.length; i++) {
        const ref = req.referenceImages[i];
        const ext = ref.image.type === "image/png" ? "png" : ref.image.type === "image/webp" ? "webp" : "jpg";
        form.append("image[]", ref.image, `ref_${i + 1}.${ext}`);
      }

      response = await fetch(`${apiBase}/images/edits`, {
        signal: req.signal,
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      const body: Record<string, unknown> = {
        model,
        prompt: req.prompt,
        size,
        n: 1,
      };
      if (quality !== "auto") {
        body.quality = quality;
      }
      response = await fetch(`${apiBase}/images/generations`, {
        signal: req.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Images endpoint failed (${response.status}): ${errText.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    const item = payload.data?.[0];
    if (item?.b64_json) {
      return {
        imageBytes: decodeBase64(item.b64_json),
        mimeType: "image/png",
      };
    }
    if (item?.url) {
      return fetchImageFromUrlOrData(item.url, undefined, req.signal);
    }

    throw new Error("Images endpoint response did not contain b64_json or url");
  }

  private async tryImagesEndpoint(
    apiBase: string,
    apiKey: string,
    model: string,
    req: OpenAIImageGenInput,
    sizeCandidates?: string[]
  ): Promise<GenerateGridResult> {
    // Allow explicit override via AI_IMAGE_SIZE for 1:1 grid requests
    const configuredSize = sizeCandidates ? undefined : process.env.AI_IMAGE_SIZE?.trim();
    const candidates = configuredSize
      ? [configuredSize]
      : sizeCandidates ?? ["3840x3840", "4096x4096", "2048x2048", "1024x1024"];

    let lastErr: unknown;
    for (const size of candidates) {
      try {
        return await this.callImagesEndpointOnce(apiBase, apiKey, model, size, req);
      } catch (err) {
        req.signal?.throwIfAborted();
        lastErr = err;
        const msg = err instanceof Error ? err.message : "";
        // Only retry smaller size on 400/422 validation errors
        if (!msg.includes("(400)") && !msg.includes("(422)")) {
          throw err;
        }
        console.warn(`[openai-relay] size=${size} rejected, trying next size...`);
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error("Images endpoint failed");
  }

  private async tryChatCompletionsEndpoint(
    apiBase: string,
    apiKey: string,
    model: string,
    req: OpenAIImageGenInput
  ): Promise<GenerateGridResult> {
    const refParts = await Promise.all(
      req.referenceImages.map(async (ref) => ({
        type: "image_url",
        image_url: {
          url: `data:${ref.image.type};base64,${Buffer.from(await ref.image.arrayBuffer()).toString("base64")}`,
        },
      }))
    );
    const contentParts: Array<Record<string, unknown>> = [{ type: "text", text: req.prompt }, ...refParts];

    const response = await fetch(`${apiBase}/chat/completions`, {
      signal: req.signal,
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
      throw new Error(`Chat completions failed (${response.status}): ${errText.slice(0, 300)}`);
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
      const dataMatch = message.content.match(
        /data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+/
      );
      if (dataMatch) {
        imageUrl = dataMatch[0];
      } else {
        const urlMatch = message.content.match(/https?:\/\/[^\s)"']+/);
        if (urlMatch) imageUrl = urlMatch[0];
      }
    }

    if (!imageUrl) {
      throw new Error("Chat completions response did not contain a generated image");
    }

    return fetchImageFromUrlOrData(imageUrl, payload.id, req.signal);
  }

  private async executeGeneration(
    req: OpenAIImageGenInput,
    sizeCandidates?: string[]
  ): Promise<GenerateGridResult> {
    const apiBase = (process.env.AI_IMAGE_API_BASE || "https://openrouter.ai/api/v1").replace(
      /\/$/,
      ""
    );
    const apiKey = process.env.AI_IMAGE_API_KEY;
    const model = process.env.AI_IMAGE_MODEL || "google/gemini-3-pro-image-preview";

    if (!apiKey) {
      throw new Error("AI_IMAGE_API_KEY is not configured for openai-relay provider");
    }

    const preferImagesApi =
      (process.env.AI_IMAGE_PROVIDER || "").toLowerCase() === "openai" ||
      /^(gpt-image|dall-e)/i.test(model);

    if (preferImagesApi) {
      try {
        return await this.tryImagesEndpoint(apiBase, apiKey, model, req, sizeCandidates);
      } catch (primaryErr) {
        req.signal?.throwIfAborted();
        const msg = primaryErr instanceof Error ? primaryErr.message : "";
        // Only fall back to /chat/completions if the /images endpoint itself is unsupported (404/405)
        if (msg.includes("(404)") || msg.includes("(405)")) {
          console.warn("[openai-relay] /images endpoint unsupported, falling back to /chat/completions");
          return this.tryChatCompletionsEndpoint(apiBase, apiKey, model, req);
        }
        throw primaryErr;
      }
    }

    try {
      return await this.tryChatCompletionsEndpoint(apiBase, apiKey, model, req);
    } catch (primaryErr) {
      req.signal?.throwIfAborted();
      console.warn("[openai-relay] /chat/completions failed, falling back to /images:", primaryErr);
      return this.tryImagesEndpoint(apiBase, apiKey, model, req, sizeCandidates);
    }
  }

  async generateGrid(req: GenerateGridRequest): Promise<GenerateGridResult> {
    return this.executeGeneration(req);
  }

  async generateAsset(req: GenerateAssetRequest): Promise<GenerateGridResult> {
    const rasterRefs = req.referenceImages.filter(
      (ref) => ref.image.type && ref.image.type !== "image/svg+xml"
    );
    const sizeCandidates =
      req.aspectRatio === "16:9"
        ? ["1536x1024", "1792x1024", "1024x1024"]
        : req.resolution === "2K"
          ? ["2048x2048", "1024x1024"]
          : ["1024x1024"];
    return this.executeGeneration({ ...req, referenceImages: rasterRefs }, sizeCandidates);
  }
}
