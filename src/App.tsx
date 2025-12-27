import { DropZone } from './components/DropZone';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';

function App() {
  return (
    <div className="h-screen w-screen flex bg-gray-950 text-white overflow-hidden">
      <DropZone />
      <Sidebar />
      <Editor />
    </div>
  )
}

export default App
