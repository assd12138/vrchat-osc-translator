import qiniu from "qiniu";
/**
 * 获取七牛云的上传token
 * @param accessKey ak
 * @param secretKey sk
 * @param bucket 存储桶
 * @returns
 */
export function getQiniuToken(
  accessKey: string,
  secretKey: string,
  bucket: string,
): string {
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const options = {
    scope: bucket,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}
