
import './css/App.css'
import { Routes, Route } from 'react-router-dom';
import Auth from './Pages/Auth.tsx';
import DocsPage from './Components/Docs.tsx';
import TextEditor from './Components/TextEditor.tsx';
import ProtectedRoute from './common/ProtectedRoute.tsx';
import LandingPage from './Pages/LandingPage.tsx';
import ForgotPassword from './Components/ForgotPassword.tsx';


function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/reset-password" element={<ForgotPassword mode="reset" />} />
          <Route path="/document-type" element={<ProtectedRoute> <DocsPage /> </ProtectedRoute>} />
          <Route path="/editor/:link" element={<ProtectedRoute> <TextEditor /> </ProtectedRoute>} />
          <Route path="/landing-page" element={<LandingPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
