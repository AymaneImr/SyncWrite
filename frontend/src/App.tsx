
import './css/App.css'
import { Routes, Route } from 'react-router-dom';
import Auth from './Pages/Auth.tsx';
import WorkspacePage from './Components/Docs.tsx';
import TextEditor from './Components/TextEditor.tsx';
import ProtectedRoute from './common/ProtectedRoute.tsx';
import LandingPage from './Pages/LandingPage.tsx';
import ForgotPassword from './Components/ForgotPassword.tsx';
import GoogleOauthCallback from './Pages/GoogleOauthCallback.tsx';
import SecurityPage from './Pages/SecurityPage.tsx';
import DocsPage from './Pages/DocsPage.tsx';
import AboutPage from './Pages/AboutPage.tsx';


function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/oauth/google/callback" element={<GoogleOauthCallback />} />
          <Route path="/reset-password" element={<ForgotPassword mode="reset" />} />
          <Route path="/workspace" element={<ProtectedRoute> <WorkspacePage /> </ProtectedRoute>} />
          <Route path="/editor/:link" element={<ProtectedRoute> <TextEditor /> </ProtectedRoute>} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
