import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { compressImage, upload } from "qiniu-js";

const s3 = new S3Client({
  region: import.meta.env.VITE_DEFAULT_S3_REGION,
  endpoint: import.meta.env.VITE_DEFAULT_S3_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_DEFAULT_S3_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_DEFAULT_S3_SECRET_KEY,
  },
});

export const uploadImage2 = async (data: { file: File }) => {
  console.log(data);

  const signData = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: import.meta.env.VITE_DEFAULT_S3_BUCKET,
      Key: "a.png",
    }),
    {
      expiresIn: 3600,
    },
  );
  console.log({ signData });

  s3.send(
    new PutObjectCommand({
      Bucket: import.meta.env.VITE_DEFAULT_S3_BUCKET,
      Key: "a.png",
      Body: data.file.stream(),
    }),
  );
};

export const uploadImage = async (data: { file: File; token: string }) => {
  const res = await compressImage(data.file, {
    maxHeight: 2048,
    maxWidth: 2048,
  });

  const newFile = new File([res.dist], "image.png", {
    type: res.dist.type,
  });

  const randomFileName = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}.png`;

  const ob = upload(newFile, randomFileName, data.token, undefined, {
    upprotocol: "http",
  });
  const url = await new Promise<string>((resolve) => {
    ob.subscribe({
      next(val) {
        console.log("next", val);
      },
      complete(val) {
        const url = new URL(val.key, import.meta.env.VITE_DEFAULT_S3_URL).href;
        resolve(url);
      },
    });
  });
  return url;
};
