import { Alert, Box, Button, CircularProgress, Container, Grid, TextField, Typography } from '@mui/material';
import { confirmPasswordReset } from 'firebase/auth';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithEmailAndPassword } from '../services/firebase';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { isValidPassword } from '../utils/validations';

interface ResetPasswordFormProps {
  actionCode: string;
  accountEmail: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ actionCode, accountEmail }) => {

  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    try {
      setIsResetting(true);
      if (!isValidPassword(newPassword)) {
        setPasswordError("Your password must meet the following requirements:\n" +
          "* Must be at least 8 characters long\n" +
          "* Must include at least two of the following:\n" +
          "  - Uppercase letter\n" +
          "  - Lowercase letter\n" +
          "  - Number\n" +
          "  - Special character such as @, $, or !");
        setIsResetting(false);
        return;
      }


      if (newPassword !== retypePassword) {
        setPasswordError('Passwords do not match.');
        setIsResetting(false);
        return;
      }

      await confirmPasswordReset(auth, actionCode, newPassword);
      // Password reset has been confirmed and new password updated.
      await loginWithEmailAndPassword(accountEmail, newPassword);
      setIsResetting(false);

      navigate('/');
    } catch (error) {
      console.error('Password reset error:', error);
      setIsResetting(false);
      setPasswordError('Failed to reset password. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Container maxWidth="xs">
        <Typography variant="h4" sx={{ marginBottom: '4rem', textAlign: 'center' }}>Reset Password</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              variant="outlined"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="Retype Password"
              variant="outlined"
              value={retypePassword}
              onChange={(e) => setRetypePassword(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <PasswordStrengthIndicator password={newPassword} />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
            </Button>
            {isResetting && (
              <Box mt={2} display="flex" justifyContent="center">
                <CircularProgress size={20} color="inherit" />
              </Box>
            )}
            {passwordError && (
              <Box mt={2}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </Alert>
              </Box>
            )}


          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default ResetPasswordForm;
