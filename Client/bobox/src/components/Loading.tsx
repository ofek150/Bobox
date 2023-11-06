import { CircularProgress, useTheme } from '@mui/material';
import React from 'react';

const Loading: React.FC = () => {
    const theme = useTheme();
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: theme.palette.background.default }}>
            <CircularProgress />
        </div>
    );
};

export default Loading;
