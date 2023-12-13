import { createTheme } from '@mui/material';

const theme = createTheme({
    typography: {
        allVariants: {
            fontFamily: 'Roboto, sans-serif',
        },
    },
    palette: {
        primary: {
            main: '#213555',
        },
        secondary: {
            main: '#4F709C',
        },
        background: {
            default: '#FFFFFF',
        },
        text: {
            primary: '#172B3F',
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
                        backgroundColor: '#4F709C',
                        color: '#ffffff',
                    },
                    '&:hover': {
                        backgroundColor: '#213555',
                        color: '#ffffff',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    backgroundColor: '#FFFFFF',
                },
            },
        },
        MuiCheckbox: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: '#00000014',
                    },
                },
            },
        }
    },
});

export default theme;
