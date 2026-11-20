import type { GenerateGridRequest, GenerateGridResult, ImageProvider } from "./types";

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
  providerJobId?: string
): Promise<GenerateGridResult> {
  const parsedData = parseDataUrl(imageUrl);
  if (parsedData) {
    return {
      imageBytes: parsedData.bytes,
      mimeType: parsedData.mimeType,
      providerJobId,
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
    providerJobId,
  };
}

async function resolveReferenceBlob(url: string, mimeType: string): Promise<Blob> {
  const parsed = parseDataUrl(url);
  if (parsed) {
    const copy = new Uint8Array(parsed.bytes.byteLength);
    copy.set(parsed.bytes);
    return new Blob([copy.buffer], { type: mimeType || parsed.mimeType });
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image (${res.status})`);
  }
  return res.blob();
}

/**
 * OpenAI-compatible & OpenRouter multimodal image generation relay adapter.
 * Automatically supports:
 *  - Standard OpenAI `/images/generations` & `/images/edits` (gpt-image-*, dall-e-*)
 *  - Chat completions multimodal image outputs (`/chat/completions`, e.g. OpenRouter / Gemini relays)
 */
export class OpenAIRelayImageProvider implements ImageProvider {
  readonly name = "openai-relay";

  private async tryImagesEndpoint(
    apiBase: string,
    apiKey: string,
    model: string,
    req: GenerateGridRequest
  ): Promise<GenerateGridResult> {
    let response: Response;

    if (req.referenceImages.length > 0) {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", req.prompt);
      form.append("size", "1024x1024");
      form.append("n", "1");

      for (let i = 0; i < req.referenceImages.length; i++) {
        const ref = req.referenceImages[i];
        const blob = await resolveReferenceBlob(ref.url, ref.mimeType);
        form.append("image[]", blob, `ref_${i + 1}.jpg`);
      }

      response = await fetch(`${apiBase}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      response = await fetch(`${apiBase}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: req.prompt,
          size: "1024x1024",
          n: 1,
        }),
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
      return fetchImageFromUrlOrData(item.url);
    }

    throw new Error("Images endpoint response did not contain b64_json or url");
  }

  private async tryChatCompletionsEndpoint(
    apiBase: string,
    apiKey: string,
    model: string,
    req: GenerateGridRequest
  ): Promise<GenerateGridResult> {
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

    return fetchImageFromUrlOrData(imageUrl, payload.id);
  }

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

    const preferImagesApi =
      (process.env.AI_IMAGE_PROVIDER || "").toLowerCase() === "openai" ||
      /^(gpt-image|dall-e)/i.test(model);

    if (preferImagesApi) {
      try {
        return await this.tryImagesEndpoint(apiBase, apiKey, model, req);
      } catch (primaryErr) {
        console.warn("[openai-relay] /images endpoint failed, falling back to /chat/completions:", primaryErr);
        return this.tryChatCompletionsEndpoint(apiBase, apiKey, model, req);
      }
    }

    try {
      return await this.tryChatCompletionsEndpoint(apiBase, apiKey, model, req);
    } catch (primaryErr) {
      console.warn("[openai-relay] /chat/completions failed, falling back to /images:", primaryErr);
      return this.tryImagesEndpoint(apiBase, apiKey, model, req);
    }
  }
}
