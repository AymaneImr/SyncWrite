
import './css/App.css'
import { Routes, Route } from 'react-router-dom';
import Auth from './Pages/Auth.tsx';
import DocsPage from './Components/Docs.tsx';
import TextEditor from './Components/TextEditor.tsx';


function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/document-type" element={<DocsPage />} />
          <Route path="/text-editor" element={<TextEditor />} />
        </Routes>
      </main>
    </>
  )
}

export default App
