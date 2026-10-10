import AudioPanel from "../audio-panel";
import SubtitleRecognitionPanel from "../subtitle-recognition-panel";

/** Compose the page without sharing either recognition panel's session state. */
export default function SpeechRecognitionPanel() {
  return (
    <>
      <AudioPanel />
      <SubtitleRecognitionPanel />
    </>
  );
}
