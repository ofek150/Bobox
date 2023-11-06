import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    typography: {
        allVariants: {
            fontFamily: 'Roboto, sans-serif',
        },
    },
    palette: {
        primary: {
            main: '#213555', // Set #213555 as the primary color
        },
        secondary: {
            main: '#4F709C', // Set #4F709C as the secondary color
        },
        background: {
            default: '#FFFFFF', // Set #F5EFE7 as the background color
        },
        text: {
            primary: '#172B3F', // Set #172B3F as the moderately darker text color
            secondary: '#666666',
        },
        action: {
            hoverOpacity: 0.8,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    color: '#ffffff',
                },
                contained: {
                    backgroundColor: '#213555',
                    color: '#ffffff',
                    '&:hover': {
                        backgroundColor: '#3F649E',
                    },
                },
                text: {
                    backgroundColor: 'transparent',
                    color: '#172B3F',
                    '&:hover': {
                        backgroundColor: '#00000014'
                    },
                },
                outlined: {
                    backgroundColor: 'transparent',
                    borderColor: '#213555',
                    color: '#172B3F',
                    '&:hover': {
                        backgroundColor: '#00000014',
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: '#00000014',
                    },
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    borderRadius: '10px',
                },
                indicator: {
                    borderRadius: '10px',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    borderRadius: '10px',
                    '&.Mui-selected': {
                        backgroundColor: '#4F709C', // Set #4F709C as the selected tab color
                        color: '#ffffff',
                    },
                    '&:hover': {
                        backgroundColor: '#213555', // New hover color for tabs
                        color: '#ffffff', // Text color for hover on tabs
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    backgroundColor: '#FFFFFF', // changed from #F5EFE7
                },
            },
        }
    },
});

export default theme;
