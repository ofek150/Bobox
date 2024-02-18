import { Button, Grid, LinearProgress, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getUserData, logout } from '../services/firebase';
import Loading from '../components/Loading';
import { enqueueSnackbar } from 'notistack';
import { useNavigate } from 'react-router';
import { formatFileSize, formatToMB } from '../utils/helpers';

interface AccountInfo {
    name: string;
    email: string;
    totalFileSize: number;
    agreeMailToPromotions: boolean;
    maxTotalFileSize: number;
}

const AccountInformation: React.FC = () => {
    const [user] = useAuthState(auth);
    const [loading, setLoading] = useState(true);
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        if (user) {
            const userData = await getUserData(user.uid);
            if(!userData) {
                handleError('Failed to fetch user information');
                navigate('/');
            }
            console.log("User data: ", userData);
            setAccountInfo({
                name: userData?.name,
                email: userData?.email,
                totalFileSize: userData?.totalFileSize,
                agreeMailToPromotions: userData?.agreeMailToPromotions,
                maxTotalFileSize: userData?.maxTotalFileSize,  
            });
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    useEffect(() => {
        if(accountInfo) setLoading(false);
    }, [accountInfo]);

    useEffect(() => {
        console.log("Loading ", loading);
    }, [loading])

    const handleLogout = () => {
        logout();
    };

    const handleError = (error: string | null = null) => {
        console.error(error);
        enqueueSnackbar(error, {
          variant: 'error',
          preventDuplicate: true
        });
      };

    if(loading) return <Loading />

    return (
        <Grid container direction="column" alignItems="center" maxWidth="600px" marginX="auto" mt={4} p={2}>
            {!loading && accountInfo && (
                <>
                    <h1>Account Information</h1>
                    <Grid item xs={12} sx={{ width: '100%', mb: 2 }}>
                        <TextField
                            label="Name"
                            value={accountInfo.name}
                            InputProps={{
                                readOnly: true,
                            }}
                            style={{ width: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ width: '100%', mb: 2 }}>
                        <TextField
                            label="Email"
                            value={accountInfo.email}
                            InputProps={{
                                readOnly: true,
                            }}
                            style={{ width: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ width: '100%', mb: '2' }}>
                        <LinearProgress
                            variant="determinate"
                            value={(accountInfo.totalFileSize / accountInfo.maxTotalFileSize) * 100}
                            sx={{ width: '100%' }}
                        />
                        <Typography sx={{textAlign: 'center'}}>
                            Total File Size: {formatFileSize(accountInfo.totalFileSize)} / {formatFileSize(accountInfo.maxTotalFileSize)}
                            <br/>
                            ({((accountInfo.totalFileSize / accountInfo.maxTotalFileSize) * 100).toFixed(2)}%)
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sx={{ width: '100%', mt: 3 }}>
                        <Button variant="contained" onClick={handleLogout} sx={{ width: '100%' }}>Logout</Button>
                    </Grid>
                </>
            )}
        </Grid>
    );
};

export default AccountInformation;
