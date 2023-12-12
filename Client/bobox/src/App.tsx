import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React from 'react'
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import RequireAuth from './components/RequireAuth';
import AccountInformation from './pages/AccountInformation';
import ResetPassword from './pages/ResetPassword';
import FirebaseActionHandler from './components/FirebaseActionHandler';
import UploadFile from './pages/UploadFile';
import FileInfo from './pages/FileInfo';

const App: React.FC = () => {

  return (
    <main className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>

            <Route path="/" element={<Navigate to='/upload-file' replace={true} />} />

            {/* Public routes */}
            <Route path="/login" element={<AuthPage initialTab={0} />} />
            <Route path="/signup" element={<AuthPage initialTab={1} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/action" element={<FirebaseActionHandler />} />

            {/* Protected routes */}
            <Route path="/" element={<RequireAuth />}>
              <Route path="/account-info" element={<AccountInformation />} />
              <Route path="/upload-file" element={<UploadFile />} />
              <Route path="/:ownerUid/:fileId/:downloadId/view" element={<FileInfo />} />
            </Route>


            {/* Catch all non existent routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </main>
  )
}

export default App;
