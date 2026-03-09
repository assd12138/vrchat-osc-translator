import "./App.css";
import Audiopanel from "./panel/audiopanel";
import Imagepanel from "./panel/imagepanel";
import Ocrpanel from "./panel/ocrpanel";
import Settingpanel from "./panel/settingpanel";
import Streamtranslatepanel from "./panel/streamtranslatepanel";
import Systemlog from "./panel/systemlog";
import Translationpanel from "./panel/translationpanel";

function App() {
	return (
		<div className="container">
			<Audiopanel />
			<Ocrpanel />
			<Imagepanel />
			<Translationpanel />
			<Settingpanel />
			<Systemlog />
			<Streamtranslatepanel />
		</div>
	);
}

export default App;
