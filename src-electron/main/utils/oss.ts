import { createReadStream } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mime from "mime";

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

export const uploadToOss = async (data: {
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
      ContentType: mime.getType(data.filePath) || "application/octet-stream",
    }),
  );
  return res;
};
