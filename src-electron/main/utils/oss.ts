import { createReadStream } from "node:fs";
import { extname } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".zip": "application/zip",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

const getMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
};

interface ClientConfig {
  region: string;
  endpoint: string;
  ak: string;
  sk: string;
  bucket: string;
}
const client: {
  s3: S3Client | null;
  config: ClientConfig;
} = {
  s3: null,
  config: {
    region: "",
    endpoint: "",
    ak: "",
    sk: "",
    bucket: "",
  },
};

export const uploadOss = async (data: {
  filePath: string;
  config: ClientConfig;
  key: string;
}) => {
  if (
    client.s3 === null ||
    JSON.stringify(client.config) !== JSON.stringify(data.config)
  ) {
    client.config = data.config;
    client.s3 = new S3Client({
      region: data.config.region,
      endpoint: data.config.endpoint,
      credentials: {
        accessKeyId: data.config.ak,
        secretAccessKey: data.config.sk,
      },
    });
  }
  const res = await client.s3.send(
    new PutObjectCommand({
      Bucket: data.config.bucket,
      Key: data.key,
      Body: createReadStream(data.filePath),
      ContentType: getMimeType(data.filePath),
    }),
  );
  console.log({ res });
};
