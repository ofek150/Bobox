import { Alert, Box, Container } from '@mui/material';
import { verifyPasswordResetCode } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { useLocation, } from 'react-router-dom';
import { auth } from '../services/firebase';
import ResetPasswordForm from '../pages/ResetPasswordForm';
import Loading from './Loading';

const FirebaseActionHandler: React.FC = () => {
    const urlParams = new URLSearchParams(useLocation().search);
    const mode = urlParams.get('mode');
    const actionCode = urlParams.get('oobCode');
    const continueUrl = urlParams.get('continueUrl');
    const lang = urlParams.get('lang') || 'en';

    const [accountEmail, setAccountEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAction = async () => {
            try {
                switch (mode) {
                    case 'resetPassword':
                        await handleResetPassword();
                        break;
                    case 'recoverEmail':
                        // TODO: Implement handleRecoverEmail
                        // handleRecoverEmail(auth, actionCode, lang);
                        break;
                    case 'verifyEmail':
                        // TODO: Implement handleVerifyEmail
                        // handleVerifyEmail(auth, actionCode, continueUrl, lang);
                        break;
                    default:
                        // Error: invalid mode.
                        setError('Unsupported Action');
                        break;
                }
            } catch (error) {
                console.error('Action handling error:', error);
                setError('Invalid action code');
            }
        };

        handleAction();
    }, [actionCode, continueUrl, lang, mode]);

    const handleResetPassword = async () => {
        try {
            const email = await verifyPasswordResetCode(auth, actionCode!);
            setAccountEmail(email);
        } catch (error) {
            console.error('Verify password reset code error:', error);
            setError('Invalid action code');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Container maxWidth="sm" sx={{ flex: 1 }}>
                <Box mt={4}>
                    {error ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    ) : mode === 'resetPassword' && accountEmail ? (
                        <ResetPasswordForm actionCode={actionCode!} accountEmail={accountEmail} />
                    ) : (
                        <Loading />
                    )}
                </Box>
            </Container>
        </div>
    );
};

export default FirebaseActionHandler;
