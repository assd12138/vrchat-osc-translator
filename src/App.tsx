import './App.css'
import Audiopanel from './panel/audiopanel';
import Translationpanel from './panel/translationpanel';
import Systemlog from './panel/systemlog';
import Settingpanel from './panel/settingpanel';
import Ocrpanel from './panel/ocrpanel';

function App() {

  return (
    <div className="container">
      <Audiopanel />
      <Ocrpanel />
      <Translationpanel />
      <Settingpanel />
      <Systemlog />
    </div>
  );
}

export default App;
