import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';

const FileNotFound: React.FC = () => {
    return (
        <Box style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Container maxWidth="xs">
                <Paper elevation={3} sx={{ py: 2, px: 1, borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                        404 Not Found
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        The requested file could not be found.
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default FileNotFound;
