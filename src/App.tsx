import "./App.css";
import Audiopanel from "./panel/audio-panel";
import Imagepanel from "./panel/image-panel";
import Ocrpanel from "./panel/ocr-panel";
import Settingpanel from "./panel/setting-panel";
// import Streamtranslatepanel from "./panel/streamtranslatepanel";
import Systemlog from "./panel/system-log";
import Translationpanel from "./panel/translation-panel";

function App() {
  return (
    <div className="container">
      <Audiopanel />
      <Ocrpanel />
      <Imagepanel />
      <Translationpanel />
      <Settingpanel />
      <Systemlog />
      {/* <Streamtranslatepanel /> */}
    </div>
  );
}

export default App;
