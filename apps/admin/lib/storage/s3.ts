import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * S3-compatible storage client. The server never touches file bytes — uploads
 * go directly from the browser to the bucket via presigned PUT URLs. The
 * server's job is to mint presigned URLs, verify existence with HEAD, and
 * delete objects when files are removed or replaced.
 */

let _client: S3Client | undefined;

export function s3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

/**
 * Mint a presigned PUT URL the browser can upload directly to. `contentType`
 * is baked into the signature so the browser must send the same header.
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresSeconds = 60 * 10
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client(), cmd, { expiresIn: expiresSeconds });
}

/**
 * Returns true if the object exists. Used by `confirmUpload` to verify a
 * client's claim that a PUT succeeded before inserting a DB row.
 */
export async function headObject(key: string): Promise<boolean> {
  try {
    await s3Client().send(
      new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key })
    );
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404 || status === 403) return false;
    throw err;
  }
}

/**
 * Compute the public read URL for an S3 key. Absolute URLs are built at
 * render time from this prefix so changing the bucket host never requires a
 * data migration.
 */
export function publicUrl(key: string): string {
  const base = env.S3_PUBLIC_URL_BASE.replace(/\/+$/, "");
  const k = key.replace(/^\/+/, "");
  return `${base}/${k}`;
}

/**
 * Batch delete. Used on file delete and replace. S3's DeleteObjects takes up
 * to 1000 keys per request — we chunk to be safe.
 */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }
  for (const chunk of chunks) {
    await s3Client().send(
      new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}
