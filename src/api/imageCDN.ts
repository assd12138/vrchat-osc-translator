import { compressImage, upload } from "qiniu-js";
import { request } from ".";
import { format } from "date-fns";


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
  
  const ob = upload(newFile, format(new Date(), 'HH:mm:ss') + '.png' , data.token, undefined, {
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

export const getQiniuToken = () => {
  return request('http://localhost:3802/qiniuToken', {
    method: 'GET'
  })
}