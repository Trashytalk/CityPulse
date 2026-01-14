// apps/api/src/lib/s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

// Initialize S3 client (works with R2, MinIO, AWS S3)
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO/R2
});

const bucket = env.S3_BUCKET;

/**
 * Generate presigned URL for upload
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Generate presigned URL for download
 */
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  // If public URL is configured, use it
  if (env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL}/${key}`;
  }
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Upload file directly
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  await s3.send(command);
}

/**
 * Download file
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  const response = await s3.send(command);
  const stream = response.Body as NodeJS.ReadableStream;
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Delete file
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  await s3.send(command);
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate storage key for different file types
 */
export const storageKeys = {
  sessionRaw: (sessionId: string, filename: string) =>
    `sessions/${sessionId}/raw/${filename}`,
  
  frameRaw: (sessionId: string, frameId: string) =>
    `sessions/${sessionId}/frames/${frameId}/raw.jpg`,
  
  frameProcessed: (sessionId: string, frameId: string) =>
    `sessions/${sessionId}/frames/${frameId}/processed.jpg`,
  
  frameThumbnail: (sessionId: string, frameId: string) =>
    `sessions/${sessionId}/frames/${frameId}/thumb.jpg`,
  
  avatar: (userId: string) =>
    `users/${userId}/avatar.jpg`,
};
