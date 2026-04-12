import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { FileRecord } from "@/lib/db/file-system-types";

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
 * S3 SigV4's hard max for presigned URL expiry.
 */
const MAX_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Mint a presigned GET URL for a private bucket object. We serve all file
 * reads via signed URLs because the production bucket is not public. URLs are
 * baked into HTML at render time, so the 7-day TTL is effectively "forever"
 * for any rendered page (browser will refresh on next page load).
 */
export async function signedReadUrl(
  key: string,
  expiresSeconds = MAX_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3Client(), cmd, { expiresIn: expiresSeconds });
}

/**
 * Enrich a `FileRecord` with presigned read URLs for the original and any
 * thumbnails. Client components render from these fields directly — they
 * never need to know the bucket host or presign anything themselves.
 */
export async function enrichFileRecord(file: FileRecord): Promise<FileRecord> {
  const [signedUrl, signedThumbSmUrl, signedThumbMdUrl, signedThumbLgUrl] =
    await Promise.all([
      signedReadUrl(file.s3Key),
      file.thumbSmKey ? signedReadUrl(file.thumbSmKey) : Promise.resolve(null),
      file.thumbMdKey ? signedReadUrl(file.thumbMdKey) : Promise.resolve(null),
      file.thumbLgKey ? signedReadUrl(file.thumbLgKey) : Promise.resolve(null),
    ]);
  return {
    ...file,
    signedUrl,
    signedThumbSmUrl,
    signedThumbMdUrl,
    signedThumbLgUrl,
  };
}

export async function enrichFileRecords(
  files: FileRecord[]
): Promise<FileRecord[]> {
  return Promise.all(files.map(enrichFileRecord));
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
