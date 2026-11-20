import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedClient: S3Client | null = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || "sticker-studio";
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function isR2Configured(): boolean {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not configured");
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string | null }> {
  const { bucket, publicUrl } = getR2Config();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 600,
  });

  return {
    uploadUrl,
    key: params.key,
    publicUrl: publicUrl ? `${publicUrl}/${params.key}` : null,
  };
}

export async function uploadBufferToR2(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<string> {
  const { bucket } = getR2Config();
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return params.key;
}

export async function getObjectReadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const { bucket, publicUrl } = getR2Config();
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteR2Object(key: string): Promise<void> {
  const { bucket } = getR2Config();
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
