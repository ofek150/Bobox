import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonIcon from '@mui/icons-material/Person';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, logout } from '../../services/firebase';
import Logo from '../../assets/Logo.png';
import FolderSharedIcon from '@mui/icons-material/FolderShared';

const Navbar: React.FC = () => {
    const [user] = useAuthState(auth);

    return (
        <AppBar position="sticky" sx={{ mb: 2 }}>
            <Toolbar>
                {/* Logo */}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, my: 1 }}>
                    <RouterLink to="/" style={{ textDecoration: 'none', color: 'white' }}>
                        <img
                            src={Logo}
                            alt="Bobox Logo"
                            style={{ maxWidth: '50px', height: 'auto', display: 'block' }}
                        />
                    </RouterLink>
                </Typography>

                {/* Navigation Links */}
                {user ? (
                    // User is logged in
                    <>
                        <IconButton color="inherit" sx={{ color: 'white' }} component={RouterLink} to="/">
                            <HomeIcon />
                        </IconButton>
                        <IconButton color="inherit" sx={{ color: 'white' }} component={RouterLink} to="/user/folders/shared">
                            <FolderSharedIcon />
                        </IconButton>
                        <IconButton color="inherit" sx={{ color: 'white' }} component={RouterLink} to="/account-info">
                            <PersonIcon />
                        </IconButton>
                        <Button color="inherit" sx={{ color: 'white' }} onClick={() => logout()} endIcon={<ExitToAppIcon />}>
                            Logout
                        </Button>
                    </>
                ) : (
                    // User is not logged in
                    <>
                        <Button color="inherit" sx={{ color: 'white' }} component={RouterLink} to="/login">
                            Login
                        </Button>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
