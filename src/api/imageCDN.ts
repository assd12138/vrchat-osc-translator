import { compressImage, upload } from "qiniu-js";


export const uploadImage = async (data: {
  file: File,
  token: string
}) => {
  const res = await compressImage(data.file, {
    maxHeight: 2048,
    maxWidth: 2048,
  })
  const newFile = new File([res.dist], "image.png", {
    type: res.dist.type,
  });
  
  const randomFileName = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}.png`;

  const ob = upload(newFile, randomFileName, data.token, undefined, {
    upprotocol: 'http'
  })
  ob.subscribe({
    next(val) {
      console.log('next', val);
    },
    complete(val) {
      console.log(val);
    }
  })
}
