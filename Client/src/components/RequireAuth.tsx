import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth, waitForRoot } from '../services/firebase';
import Loading from './Loading';

const RequireAuth: React.FC = () => {
    const [user, loading] = useAuthState(auth);
    const location = useLocation();
    const [foundRoot, setFoundRoot] = useState(true);

    useEffect(() => {
        const waitForRootFolderCreation = async () => {
            await waitForRoot();
            setFoundRoot(false);
        }
        if (user) waitForRootFolderCreation();
    }, [user]);


    if (loading || foundRoot && user) {
        return <Loading />; // Display a loading state while authentication state is being resolved
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />; // Redirect to login page if user is not authenticated
    }

    return <Outlet />
};

export default RequireAuth;
