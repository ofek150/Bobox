import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React from 'react'
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import RequireAuth from './components/RequireAuth';
import AccountInformation from './pages/AccountInformation';

const App: React.FC = () => {

  return (
    <main className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>

            <Route path="/" element={<Navigate to='/account-info' replace={true} />} />

            {/* Public routes */}
            <Route path="/login" element={<AuthPage initialTab={0} />} />
            <Route path="/signup" element={<AuthPage initialTab={1} />} />

            {/* Protected routes */}
            <Route path="/" element={<RequireAuth />}>
              <Route path="/account-info" element={<AccountInformation />} />
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
