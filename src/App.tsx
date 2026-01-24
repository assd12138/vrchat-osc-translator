import './App.css'
import Audiopanel from './panel/audiopanel';
import Translationpanel from './panel/translationpanel';
import Systemlog from './panel/systemlog';
import Settingpanel from './panel/settingpanel';

function App() {

  return (
    <div className="container">
      <Audiopanel />
      <Translationpanel />
      <Settingpanel />
      <Systemlog />
    </div>
  );
}

export default App;
