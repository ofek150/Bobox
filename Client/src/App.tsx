import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React from 'react'

import Layout from './components/Layout';
import Loading from './components/Loading';
import RequireAuth from './components/RequireAuth';

// Only the shell and the file browser load eagerly; every other route is a
// separate chunk so the first paint stays small.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const FirebaseActionHandler = lazy(() => import('./components/FirebaseActionHandler'));
const AccountInformation = lazy(() => import('./pages/AccountInformation'));
const UploadFile = lazy(() => import('./pages/UploadFile'));
const FileInfo = lazy(() => import('./pages/FileInfo'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const MyFiles = lazy(() => import('./pages/MyFiles'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const App: React.FC = () => {

  return (
    <main className="App">
      <Router>
        <Suspense fallback={<Loading />}>
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
        </Suspense>
      </Router>
    </main>
  )
}

export default App
