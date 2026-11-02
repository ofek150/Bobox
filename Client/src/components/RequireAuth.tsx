import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth, logout, waitForRoot } from '../services/firebase';
import Loading from './Loading';
import { Button } from '@/components/ui/button';

type SetupState = 'waiting' | 'ready' | 'slow';

const RequireAuth: React.FC = () => {
    const [user, loading] = useAuthState(auth);
    const location = useLocation();
    const [setup, setSetup] = useState<SetupState>('waiting');

    useEffect(() => {
        if (!user) return;
        let alive = true;
        setSetup('waiting');
        // Resolves false when the root folder never shows up in 15s (slow
        // Google-signup initialization, offline) so we can offer an escape.
        waitForRoot().then((found) => {
            if (!alive) return;
            setSetup(found ? 'ready' : 'slow');
        });
        return () => { alive = false; };
    }, [user]);

    if (loading) {
        return <Loading />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (setup === 'waiting') {
        return <Loading />;
    }

    if (setup === 'slow') {
        const retry = () => {
            setSetup('waiting');
            waitForRoot().then((found) => setSetup(found ? 'ready' : 'slow'));
        };
        return (
            <div className="flex flex-1 items-center justify-center px-4 py-16">
                <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                    <h1 className="text-2xl font-bold">Setting up your account</h1>
                    <p className="text-muted-foreground">
                        This is taking longer than usual. Check that you are online and
                        wait a moment, or sign out and sign in again to retry.
                    </p>
                    <div className="mt-2 flex gap-2">
                        <Button onClick={retry}>
                            Try again
                        </Button>
                        <Button variant="secondary" onClick={() => logout()}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return <Outlet />
};

export default RequireAuth;
