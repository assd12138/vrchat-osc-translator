import type { IpcMainEvent } from "electron";
import { sendAudioBufferToSherpa } from "../../utils/sherpa";

export function initSherpaRecognizePort(event: IpcMainEvent) {
  console.log("initSherpaRecognizePort");
  const port = event.ports[0];

  port.on("message", (event) => {
    const data = event.data as Buffer;
    const newText = sendAudioBufferToSherpa(data);
    //需要把这个结果告知渲染环境
    console.log(newText);
  });
  port.start();
}
