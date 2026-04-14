import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  AlbumItem,
  AlbumResolver,
  FileUrlResolver,
  ResolvedAlbum,
} from "@pfadipuck/puck-web/fields/file-picker-types";
import { MongoClient, ObjectId } from "mongodb";
import { isMediaUnlocked } from "./media-unlock-cookie";

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

function mongoClient(): MongoClient {
  if (!globalForState._mongoClient) {
    globalForState._mongoClient = new MongoClient(
      process.env.MONGODB_CONNECTION_STRING!
    );
  }
  return globalForState._mongoClient;
}

type FileMeta = {
  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  thumbLgKey: string | null;
  posterKey: string | null;
  passwordProtected: boolean;
};

async function getFileMeta(fileId: string): Promise<FileMeta | null> {
  if (!ObjectId.isValid(fileId)) return null;
  const db = mongoClient().db(process.env.MONGODB_DB_NAME!);
  const doc = await db.collection("files").findOne(
    { _id: new ObjectId(fileId) },
    {
      projection: {
        s3Key: 1,
        thumbSmKey: 1,
        thumbMdKey: 1,
        thumbLgKey: 1,
        posterKey: 1,
        passwordProtected: 1,
      },
    }
  );
  if (!doc) return null;
  return {
    s3Key: doc.s3Key as string,
    thumbSmKey: (doc.thumbSmKey as string | null) ?? null,
    thumbMdKey: (doc.thumbMdKey as string | null) ?? null,
    thumbLgKey: (doc.thumbLgKey as string | null) ?? null,
    posterKey: (doc.posterKey as string | null) ?? null,
    passwordProtected: (doc.passwordProtected as boolean | undefined) ?? false,
  };
}

/** Returns true iff the file belongs to at least one password-protected album. */
async function isFileInProtectedAlbum(fileId: string): Promise<boolean> {
  if (!ObjectId.isValid(fileId)) return false;
  const db = mongoClient().db(process.env.MONGODB_DB_NAME!);
  const memberships = await db
    .collection("collection_files")
    .find({ fileId: new ObjectId(fileId) }, { projection: { collectionId: 1 } })
    .toArray();
  if (memberships.length === 0) return false;
  const protectedAlbum = await db.collection("collections").findOne(
    {
      _id: { $in: memberships.map((m) => m.collectionId as ObjectId) },
      passwordProtected: true,
    },
    { projection: { _id: 1 } }
  );
  return protectedAlbum !== null;
}

/** Returns true iff this file is password-protected (file flag OR via album). */
export async function isFileProtected(fileId: string): Promise<boolean> {
  const meta = await getFileMeta(fileId);
  if (!meta) return false;
  if (meta.passwordProtected) return true;
  return isFileInProtectedAlbum(fileId);
}

async function sign(key: string): Promise<string> {
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    { expiresIn: MAX_SIGNED_URL_TTL_SECONDS }
  );
}

export const resolveFileUrl: FileUrlResolver = async (fileId, size) => {
  const meta = await getFileMeta(fileId);
  if (!meta) return null;
  // Gate behind unlock cookie when protected (file flag OR parent album).
  if (meta.passwordProtected || (await isFileInProtectedAlbum(fileId))) {
    if (!(await isMediaUnlocked())) return null;
  }
  // Fallback chain: requested → next larger → ... → original.
  const chain: Record<typeof size, Array<string | null>> = {
    sm: [meta.thumbSmKey, meta.thumbMdKey, meta.thumbLgKey, meta.s3Key],
    md: [meta.thumbMdKey, meta.thumbLgKey, meta.s3Key],
    lg: [meta.thumbLgKey, meta.s3Key],
    original: [meta.s3Key],
  };
  for (const key of chain[size]) if (key) return sign(key);
  return null;
};

/** Sign a key directly. Used by gallery server component for poster URLs. */
export async function signKey(key: string): Promise<string> {
  return sign(key);
}

/**
 * Loads an entire album for the Gallery component. Reads the collection +
 * its files, decides per-item locked state from the cookie, and signs URLs
 * for items the viewer is allowed to see. Locked items keep their blurhash
 * + dimensions so the placeholder can render at the right aspect ratio.
 */
export const resolveAlbumData: AlbumResolver = async (collectionId) => {
  if (!ObjectId.isValid(collectionId)) return null;
  const db = mongoClient().db(process.env.MONGODB_DB_NAME!);
  const collectionDoc = await db
    .collection("collections")
    .findOne({ _id: new ObjectId(collectionId) });
  if (!collectionDoc || collectionDoc.type !== "album") return null;

  const albumProtected = (collectionDoc.passwordProtected as boolean) ?? false;
  const unlocked = await isMediaUnlocked();

  const memberships = await db
    .collection("collection_files")
    .find({ collectionId: new ObjectId(collectionId) })
    .sort({ sortOrder: 1, addedAt: 1 })
    .toArray();
  if (memberships.length === 0) {
    return {
      collectionId,
      title: (collectionDoc.title as string) ?? "",
      passwordProtected: albumProtected,
      unlocked,
      items: [],
    } satisfies ResolvedAlbum;
  }

  const fileIds = memberships.map((m) => m.fileId as ObjectId);
  const fileDocs = await db
    .collection("files")
    .find({ _id: { $in: fileIds } })
    .toArray();
  const byId = new Map(fileDocs.map((d) => [d._id.toString(), d]));

  const items: AlbumItem[] = await Promise.all(
    memberships.map(async (m) => {
      const id = (m.fileId as ObjectId).toString();
      const f = byId.get(id);
      const kind = (f?.kind as "image" | "video" | "document") ?? "image";
      const itemProtected = (f?.passwordProtected as boolean) ?? false;
      const locked = (albumProtected || itemProtected) && !unlocked;

      const baseAlbumItem = (
        urls: AlbumItem["urls"],
        posterUrl: string | null,
        videoUrl: string | null
      ): AlbumItem => ({
        fileId: id,
        kind: kind === "video" ? "video" : "image",
        width: (f?.width as number | null) ?? null,
        height: (f?.height as number | null) ?? null,
        blurhash: (f?.blurhash as string | null) ?? null,
        alt: (f?.altText as string | null) ?? null,
        locked,
        urls,
        posterUrl,
        videoUrl,
      });

      if (locked || !f) return baseAlbumItem(null, null, null);

      const [sm, md, lg] = await Promise.all([
        signImageChain(f, "sm", kind),
        signImageChain(f, "md", kind),
        signImageChain(f, "lg", kind),
      ]);
      const posterKey = (f?.posterKey as string | null) ?? null;
      const posterUrl = posterKey ? await sign(posterKey) : null;
      const videoUrl =
        kind === "video"
          ? await sign((f.s3Key as string) ?? "")
          : null;
      return baseAlbumItem({ sm, md, lg }, posterUrl, videoUrl);
    })
  );

  return {
    collectionId,
    title: (collectionDoc.title as string) ?? "",
    passwordProtected: albumProtected,
    unlocked,
    items,
  } satisfies ResolvedAlbum;
};

/**
 * Sign a thumbnail URL for the given size. For images, falls back through
 * the thumb chain to the original image (`s3Key`). For videos, falls back
 * through the thumb chain to the legacy `posterKey` — NEVER to `s3Key`,
 * which would return the raw video binary.
 */
async function signImageChain(
  doc: Record<string, unknown>,
  size: "sm" | "md" | "lg",
  kind: string
): Promise<string | null> {
  const sm = (doc.thumbSmKey as string | null) ?? null;
  const md = (doc.thumbMdKey as string | null) ?? null;
  const lg = (doc.thumbLgKey as string | null) ?? null;
  const poster = (doc.posterKey as string | null) ?? null;
  const originalImage = kind === "image" ? ((doc.s3Key as string) ?? null) : null;
  const chain: Record<typeof size, Array<string | null>> = {
    sm: [sm, md, lg, poster, originalImage],
    md: [md, lg, poster, originalImage],
    lg: [lg, poster, originalImage],
  };
  for (const key of chain[size]) if (key) return sign(key);
  return null;
}
