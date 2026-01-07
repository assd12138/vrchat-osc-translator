import { invoke } from '@tauri-apps/api/core';
import './App.css'
import Audiopanel from './panel/audiopanel';

async (name: string)=>{
  const a = await invoke<string>("greet", { name })
  console.log(a);
}
function App() {

  return (
    <div className="container">
      <Audiopanel />
    </div>
  );
}

export default App;
