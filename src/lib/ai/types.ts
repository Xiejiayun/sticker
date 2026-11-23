export type StoreAssetKind = "cover" | "banner" | "icon";

export interface ReferenceImageInput {
  // Loaded from private storage for this request; only stable URLs are persisted.
  image: Blob;
  role: "character" | "pet" | "outfit" | "prop";
}

export interface GenerateGridRequest {
  signal?: AbortSignal;
  prompt: string;
  aspectRatio: "1:1";
  resolution: "4K";
  gridSize: "3x3" | "4x4";
  referenceImages: ReferenceImageInput[];
  slotsPreview?: Array<{ index: number; caption: string }>;
}

export interface GenerateAssetRequest {
  signal?: AbortSignal;
  kind: StoreAssetKind;
  prompt: string;
  aspectRatio: "1:1" | "16:9";
  resolution: "1K" | "2K";
  referenceImages: ReferenceImageInput[];
}

export interface GenerateGridResult {
  imageBytes: Uint8Array;
  mimeType: "image/png" | "image/webp" | "image/svg+xml";
  providerJobId?: string;
  rawMeta?: Record<string, unknown>;
}

export interface ImageProvider {
  readonly name: string;
  generateGrid(req: GenerateGridRequest): Promise<GenerateGridResult>;
  generateAsset(req: GenerateAssetRequest): Promise<GenerateGridResult>;
}
