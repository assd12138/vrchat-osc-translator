import { invoke } from '@tauri-apps/api/core';
import './App.css'
import Audiopanel from './panel/audiopanel';
import Translationpanel from './panel/translationpanel';
import Systemlog from './panel/systemlog';

async (name: string) => {
  const a = await invoke<string>("greet", { name })
  console.log(a);
}
function App() {

  return (
    <div className="container">
      <Audiopanel />
      <Systemlog />
      <Translationpanel />
    </div>
  );
}

export default App;
