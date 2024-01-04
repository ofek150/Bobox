import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth } from '../services/firebase';
import Loading from './Loading';

const RequireAuth: React.FC = () => {
    const [user, loading] = useAuthState(auth);
    const location = useLocation();

    if (loading) {
        return <Loading />; // Display a loading state while authentication state is being resolved
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />; // Redirect to login page if user is not authenticated
    }

    return <Outlet />; // Render the nested child routes
};

export default RequireAuth;
