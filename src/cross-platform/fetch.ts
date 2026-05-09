import {
  type ClientOptions,
  fetch as tauriFetch,
} from "@tauri-apps/plugin-http";
import { RUNTIME, runtime } from "./environmentDetect";

export default function (
  input: string | URL | Request,
  init?: (RequestInit & ClientOptions) | undefined,
) {
  if (runtime === RUNTIME.TAURI) {
    return tauriFetch(input, init);
  } else {
    return fetch(input, init);
  }
}
