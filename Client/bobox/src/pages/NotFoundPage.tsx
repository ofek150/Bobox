import React from "react";
import { Typography } from "@mui/material";


const NotFoundPage: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '8rem' }}>
                <Typography variant="h4" gutterBottom>Something went wrong!</Typography>
                <Typography variant="h5">The page you're looking for does not exist.</Typography>
            </div>
        </div>
    );
}

export default NotFoundPage;