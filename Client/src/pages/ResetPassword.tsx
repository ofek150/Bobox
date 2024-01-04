import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { auth, sendPasswordReset } from "../services/firebase";
import {
    Typography,
    Container,
    TextField,
    Button,
    Box,
    CircularProgress,
    Link as MuiLink,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";

import { isValidEmail } from "../utils/validations";

const ResetPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [user, loading] = useAuthState(auth);
    const [isLoading, setIsLoading] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;
        if (user) navigate("/dashboard");
    }, [user, loading, navigate]);

    const handleResetPassword = async () => {
        try {
            if (!isValidEmail(email)) {
                setResetError("Invalid email format. Please enter a valid email address.");
                return;
            }

            setIsLoading(true);
            await sendPasswordReset(email);
            setIsLoading(false);
            setResetError(null);

            // Open the dialog to inform the user that the instructions will be sent to the email address
            setDialogOpen(true);
        } catch (error) {
            console.error("Password reset error:", error);
            setIsLoading(false);
            setResetError("Failed to send password reset email. Please check your email address and try again.");
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
    };

    return (
        <div style={{ flex: 1 }}>
            <Box style={{ flex: 1 }}>
                <Container maxWidth="xs">
                    <Box mt={4}>
                        <Typography variant="h4" gutterBottom sx={{ marginBottom: '4rem', textAlign: 'center' }}>
                            Reset Password
                        </Typography>
                        <TextField
                            fullWidth
                            type="text"
                            label="Email Address"
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleResetPassword}
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : "Send password reset email"}
                        </Button>
                        {resetError && (
                            <Alert severity="error" sx={{ mb: 2, marginTop: '0.8rem' }}>
                                {resetError}
                            </Alert>
                        )}
                        <Box mt={2} textAlign="center">
                            <MuiLink component={Link} to="/signup" variant="body2">
                                Don't have an account? Register now.
                            </MuiLink>
                        </Box>
                    </Box>
                </Container>
            </Box>
            {/* Dialog for account existence */}
            <Dialog open={dialogOpen} onClose={handleDialogClose}>
                <DialogTitle>Password Reset Email Sent</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        An account with the email address "{email}" is associated with us.
                        Instructions to reset the password have been sent to this email address.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default ResetPassword;
