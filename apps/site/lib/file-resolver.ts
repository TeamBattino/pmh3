import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FileUrlResolver } from "@pfadipuck/puck-web/fields/file-picker-types";
import { MongoClient, ObjectId } from "mongodb";

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

type FileKeys = {
  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  thumbLgKey: string | null;
};

async function getFileKeys(fileId: string): Promise<FileKeys | null> {
  if (!ObjectId.isValid(fileId)) return null;
  const db = mongoClient().db(process.env.MONGODB_DB_NAME!);
  const doc = await db
    .collection<FileKeys>("files")
    .findOne(
      { _id: new ObjectId(fileId) },
      { projection: { s3Key: 1, thumbSmKey: 1, thumbMdKey: 1, thumbLgKey: 1 } }
    );
  if (!doc) return null;
  return {
    s3Key: doc.s3Key,
    thumbSmKey: doc.thumbSmKey ?? null,
    thumbMdKey: doc.thumbMdKey ?? null,
    thumbLgKey: doc.thumbLgKey ?? null,
  };
}

async function sign(key: string): Promise<string> {
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    { expiresIn: MAX_SIGNED_URL_TTL_SECONDS }
  );
}

export const resolveFileUrl: FileUrlResolver = async (fileId, size) => {
  const keys = await getFileKeys(fileId);
  if (!keys) return null;
  // Fallback chain: requested → next larger → ... → original.
  const chain: Record<typeof size, Array<string | null>> = {
    sm: [keys.thumbSmKey, keys.thumbMdKey, keys.thumbLgKey, keys.s3Key],
    md: [keys.thumbMdKey, keys.thumbLgKey, keys.s3Key],
    lg: [keys.thumbLgKey, keys.s3Key],
    original: [keys.s3Key],
  };
  for (const key of chain[size]) if (key) return sign(key);
  return null;
};
