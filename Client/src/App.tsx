import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React, { useEffect } from 'react'

import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import RequireAuth from './components/RequireAuth';
import AccountInformation from './pages/AccountInformation';
import ResetPassword from './pages/ResetPassword';
import FirebaseActionHandler from './components/FirebaseActionHandler';
import UploadFile from './pages/UploadFile';
import FileInfo from './pages/FileInfo';
import MyFiles from './pages/MyFiles';
import AcceptInvitation from './pages/AcceptInvitation';


const App: React.FC = () => {

  return (
    <main className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>

            {/* Public routes */}
            <Route path="/login" element={<AuthPage initialTab={0} />} />
            <Route path="/signup" element={<AuthPage initialTab={1} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/action" element={<FirebaseActionHandler />} />

            {/* Protected routes */}
            <Route path="/" element={<RequireAuth />}>
              <Route path="/" element={<Navigate to={"/user/folders/root"} replace={true} />} />
              <Route path="/user/folders" element={<Navigate to={"/user/folders/root"} replace={true} />} />
              <Route path="/upload" element={<Navigate to={"/user/folders/root/upload"} replace={true} />} />
              <Route path="/user/folders/:folderId" element={<MyFiles />} />
              <Route path="/account-info" element={<AccountInformation />} />
              <Route path="/user/folders/:folderId/upload" element={<UploadFile />} />
              <Route path="/user/:ownerUid/files/:fileId" element={<FileInfo />} />
              <Route path="/accept_invitation" element={<AcceptInvitation />} />
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
