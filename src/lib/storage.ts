import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "./env";

function safeLocalPath(key: string) {
  const base = path.resolve(env.LOCAL_STORAGE_DIR);
  const target = path.resolve(base, key);

  if (!target.startsWith(base + path.sep)) {
    throw new Error("Invalid storage key");
  }

  return { base, target };
}

function s3Client() {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "S3 storage is selected but S3 credentials/bucket are incomplete"
    );
  }

  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export async function putPrivateObject(
  key: string,
  bytes: Uint8Array,
  contentType: string
) {
  if (
    env.NODE_ENV === "production" &&
    env.REQUIRE_REMOTE_STORAGE_IN_PRODUCTION &&
    env.STORAGE_DRIVER !== "s3"
  ) {
    throw new Error("Remote private storage is required in production");
  }

  if (env.STORAGE_DRIVER === "local") {
    const { base, target } = safeLocalPath(key);

    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(base, { recursive: true });
    await writeFile(target, bytes);

    return;
  }

  await s3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    })
  );
}

export async function getPrivateObject(key: string): Promise<Uint8Array> {
  if (
    env.NODE_ENV === "production" &&
    env.REQUIRE_REMOTE_STORAGE_IN_PRODUCTION &&
    env.STORAGE_DRIVER !== "s3"
  ) {
    throw new Error("Remote private storage is required in production");
  }

  if (env.STORAGE_DRIVER === "local") {
    const { target } = safeLocalPath(key);
    return readFile(target);
  }

  const response = await s3Client().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error("Stored object is empty");
  }

  return response.Body.transformToByteArray();
}