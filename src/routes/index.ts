import { createHashRouter } from "react-router";
import MixSoundTranslatePanel from "@/panel/mix-sound-translate-panel";
import Root from "./Root";

export default createHashRouter([
  {
    path: "/",
    Component: Root,
  },
  {
    path: "/mix-sound-translate",
    Component: MixSoundTranslatePanel,
  },
]);
