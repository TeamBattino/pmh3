"use server";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MongoClient, ObjectId } from "mongodb";
import { isMediaUnlocked, setMediaUnlockCookie } from "../media-unlock-cookie";

const MAX_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const globalForState = globalThis as unknown as {
  _s3Client?: S3Client;
  _mongoClient?: MongoClient;
};

function s3Client(): S3Client {
  if (!globalForState._s3Client) {
    globalForState._s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION!,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return globalForState._s3Client;
}

function mongo(): MongoClient {
  if (!globalForState._mongoClient) {
    globalForState._mongoClient = new MongoClient(
      process.env.MONGODB_CONNECTION_STRING!
    );
  }
  return globalForState._mongoClient;
}

async function sign(key: string): Promise<string> {
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    { expiresIn: MAX_SIGNED_URL_TTL_SECONDS }
  );
}

export type UnlockResult = { ok: true } | { ok: false; reason: "wrong" | "not-configured" };

export async function unlockMedia(password: string): Promise<UnlockResult> {
  const db = mongo().db(process.env.MONGODB_DB_NAME!);
  const settings = await db
    .collection("settings")
    .findOne({ _id: "media" as unknown as ObjectId });
  const stored = (settings?.mediaPassword as string | undefined) ?? "";
  if (!stored) return { ok: false, reason: "not-configured" };
  if (password !== stored) return { ok: false, reason: "wrong" };
  await setMediaUnlockCookie();
  return { ok: true };
}

export type SignedFileUrls = {
  fileId: string;
  sm: string | null;
  md: string | null;
  lg: string | null;
  /** For videos: signed URL of the legacy `_poster.webp` if set. */
  posterUrl: string | null;
  /** For videos: signed URL of the actual video file for `<video>` playback. */
  videoUrl: string | null;
};

/**
 * Mints signed URLs for the given file ids, but only for the caller's
 * unlock-cookie state. Returns one entry per requested id; entries whose
 * file is still locked (or missing) come back with null URLs.
 *
 * Used by Gallery's client component to swap in real images after the
 * user unlocks via the modal.
 */
export async function signProtectedFiles(
  fileIds: string[]
): Promise<SignedFileUrls[]> {
  const empty = (fileId: string): SignedFileUrls => ({
    fileId,
    sm: null,
    md: null,
    lg: null,
    posterUrl: null,
    videoUrl: null,
  });
  if (!(await isMediaUnlocked())) return fileIds.map(empty);

  const db = mongo().db(process.env.MONGODB_DB_NAME!);
  const validIds = fileIds.filter((id) => ObjectId.isValid(id));
  if (validIds.length === 0) return fileIds.map(empty);

  const docs = await db
    .collection("files")
    .find({ _id: { $in: validIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));

  return Promise.all(
    fileIds.map(async (id) => {
      const f = byId.get(id);
      if (!f) return empty(id);
      const kind = (f.kind as string) ?? "image";
      const sm = (f.thumbSmKey as string | null) ?? null;
      const md = (f.thumbMdKey as string | null) ?? null;
      const lg = (f.thumbLgKey as string | null) ?? null;
      const posterKey = (f.posterKey as string | null) ?? null;
      const fallback = kind === "image" ? ((f.s3Key as string) ?? null) : posterKey;
      const pick = async (
        chain: Array<string | null>
      ): Promise<string | null> => {
        for (const k of chain) if (k) return sign(k);
        return null;
      };
      const [smUrl, mdUrl, lgUrl, posterUrl, videoUrl] = await Promise.all([
        pick([sm, md, lg, fallback]),
        pick([md, lg, fallback]),
        pick([lg, fallback]),
        posterKey ? sign(posterKey) : Promise.resolve(null),
        kind === "video" ? sign(f.s3Key as string) : Promise.resolve(null),
      ]);
      return {
        fileId: id,
        sm: smUrl,
        md: mdUrl,
        lg: lgUrl,
        posterUrl,
        videoUrl,
      };
    })
  );
}
