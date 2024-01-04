import { Button, Grid, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getUserData, logout } from '../services/firebase';

interface AccountInfo {
    name: string;
    email: string;
}

const AccountInformation: React.FC = () => {
    const [user] = useAuthState(auth);
    const [accountInfo, setAccountInfo] = useState<AccountInfo>({ name: '', email: '' });
    // const [dialogOpen, setDialogOpen] = useState(false);
    // const [dialogTitle, setDialogTitle] = useState('');
    // const [dialogContent, setDialogContent] = useState('');

    const fetchData = async () => {
        if (user) {
            const userData = await getUserData(user.uid);
            setAccountInfo({
                name: userData?.name ?? '',
                email: userData?.email ?? '',
            });
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // const handleDialogClose = () => {
    //   setDialogOpen(false);
    // };

    const handleLogout = () => {
        logout();
    };

    // const showNotification = (title: string, content: string) => {
    //   setDialogTitle(title);
    //   setDialogContent(content);
    //   setDialogOpen(true);
    // };

    return (
        <Grid container direction="column" alignItems="center" maxWidth="600px" marginX="auto" mt={4} p={2}>
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
                <Button variant="contained" onClick={handleLogout} sx={{ width: '100%' }}>Logout</Button>
            </Grid>

            {/* Notification Dialog */}
            {/* <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogContent}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog> */}
        </Grid>
    );
};

export default AccountInformation;
