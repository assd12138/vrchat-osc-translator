import { invoke } from '@tauri-apps/api/core';
import './App.css'
import Audiopanel from './panel/audiopanel';
import Translationpanel from './panel/translationpanel';
import Systemlog from './panel/systemlog';
import Settingpanel from './panel/settingpanel';

async (name: string) => {
  const a = await invoke<string>("greet", { name })
  console.log(a);
}
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
