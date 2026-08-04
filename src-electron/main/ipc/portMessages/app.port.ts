import type { IpcMainEvent } from "electron";
import { sendAudioBufferToSherpa } from "../../utils/sherpa";

export function initSherpaRecognizePort(event: IpcMainEvent) {
  console.log("initSherpaRecognizePort");
  const port = event.ports[0];

  port.on("message", (event) => {
    const data = event.data as Buffer;
    console.log("Received audio data from renderer:", data);
    sendAudioBufferToSherpa(data);
  });
  port.start();
}
