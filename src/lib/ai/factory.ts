import type { ImageProvider } from "./types";
import { MockImageProvider } from "./mock-provider";
import { OpenAIRelayImageProvider } from "./openai-relay";
import { GeminiRelayImageProvider } from "./gemini-relay";

export function getImageProvider(): ImageProvider {
  const providerName = (process.env.AI_IMAGE_PROVIDER || "mock").toLowerCase();

  switch (providerName) {
    case "openai":
    case "openai-relay":
    case "openrouter":
      return new OpenAIRelayImageProvider();
    case "gemini-relay":
    case "gemini":
      return new GeminiRelayImageProvider();
    case "mock":
    default:
      return new MockImageProvider();
  }
}
