import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import {
  auth,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  signInWithGoogle,
} from "../services/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  TextField,
  Button,
  Container,
  Paper,
  Box,
  Tab,
  Tabs,
  Typography,
  Alert,
  CircularProgress,
  Link,
  FormControl,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import GoogleIcon from "../assets/google/btn_google_signin_light_normal_web@2x.png";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { isValidPassword, isValidEmail, isValidName } from "../utils/validations";
import { SwitchProps } from "@mui/material/Switch";
import { styled, useTheme } from "@mui/material/styles";

interface AuthPageProps {
  initialTab: number; // 0 for login, 1 for signup
}

const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.mode === 'dark' ? '#2ECA45' : '#65C466',
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color:
        theme.palette.mode === 'light'
          ? theme.palette.grey[100]
          : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 22,
    height: 22,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

const AuthPage: React.FC<AuthPageProps> = ({ initialTab }) => {
  const [email, setEmail] = useState("");
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab === 0 ? 0 : 1);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [agreeMailPromotions, setAgreeMailPromotions] = useState(false);

  useEffect(() => {
    if (user) {
      const intendedDestination = location.state?.from || "/";
      // Use the useNavigate hook to navigate the user to the intended destination
      navigate(intendedDestination);
    }

  }, [user, loading, navigate, location.state?.from]);

  useEffect(() => {
    const initialTabFromLocation = location.state?.initialTab;
    if (initialTabFromLocation !== undefined) {
      setActiveTab(initialTabFromLocation === 0 ? 0 : 1);
    }
  }, [location.state]);

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setAuthError(error.code === "auth/popup-closed-by-user" ? "User closed popup." : error.message);
      setIsLoading(false);
    }
  };


  const handleLogin = async () => {
    try {
      if (!isLoading) setIsLoading(true);
      await loginWithEmailAndPassword(email, password);
      setIsLoading(false);
      setAuthError(null);
    } catch (error) {
      setAuthError("Invalid email or password.");
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    try {
      if (password !== retypePassword) {
        setAuthError("Passwords do not match. Please retype your password correctly.");
        return;
      }
      setIsLoading(true);
      await registerWithEmailAndPassword(name, email, password, agreeMailPromotions);
      handleLogin();
    } catch (error: any) {
      setAuthError(error.message);
      setIsLoading(false);
    }
  };
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setAuthError(null);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered TabIndicatorProps={{ style: { display: 'none' } }}>
            <Tab label="Login" />
            <Tab label="Signup" />
          </Tabs>
          <Box mt={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {activeTab === 0 && (
              <>
                <Typography variant="h5" sx={{ mb: '2rem' }}>
                  Login
                </Typography>
                <TextField
                  fullWidth
                  type="text"
                  label="Email Address"
                  variant="outlined"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  error={authError !== null || (email !== "" && !isValidEmail(email))}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl fullWidth variant="outlined">
                  <TextField
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    variant="outlined"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    error={authError !== null || (password !== "" && !isValidPassword(password))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ '&:hover': { backgroundColor: '#00000014' } }}>
                            {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box textAlign="right" sx={{ mb: '1rem' }}>
                    <Link component={RouterLink} to="/reset-password" variant="body2" sx={{ color: theme.palette.text.primary }}>
                      Forgot your password?
                    </Link>
                  </Box>
                </FormControl>
                {authError && (
                  <Alert severity="error" sx={{ mb: 2, mt: 2, width: '100%' }}>
                    {authError}
                  </Alert>
                )}
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleLogin}
                  disabled={isLoading}
                  sx={{ mt: 2 }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : "Login"}
                </Button>
                <Typography variant="subtitle2" sx={{ mt: '0.5rem' }}>
                  OR
                </Typography>
                <Button
                  fullWidth
                  onClick={loginWithGoogle}
                  sx={{
                    mt: '0.5rem',
                    textAlign: 'center',
                    display: 'flex', // Use flex display
                    alignItems: 'center', // Center vertically
                    justifyContent: 'center', // Center horizontally
                    padding: '0',
                    width: '55%',
                    ":hover": { backgroundColor: 'transparent' }
                  }}
                >
                  <img src={GoogleIcon} alt="Google" style={{ width: '100%' }} />
                </Button>
              </>
            )}
            {activeTab === 1 && (
              <>
                <Typography variant="h5" sx={{ mb: '2rem' }}>
                  Create an account
                </Typography>
                <TextField
                  fullWidth
                  type="text"
                  label="Name"
                  variant="outlined"
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  error={authError !== null || (name !== "" && !isValidName(name))}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  type="text"
                  label="Email Address"
                  variant="outlined"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  error={authError !== null || (email !== "" && !isValidEmail(email))}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl fullWidth variant="outlined">
                  <TextField
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    variant="outlined"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    error={authError !== null || (password !== "" && !isValidPassword(password))}
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ '&:hover': { backgroundColor: '#00000014' } }}>
                            {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
                <FormControl fullWidth variant="outlined">
                  <TextField
                    fullWidth
                    type={showRetypePassword ? "text" : "password"}
                    label="Retype Password"
                    variant="outlined"
                    value={retypePassword}
                    onChange={(e: any) => setRetypePassword(e.target.value)}
                    error={authError !== null || (retypePassword !== password)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowRetypePassword(!showRetypePassword)} sx={{ '&:hover': { backgroundColor: '#00000014' } }}>
                            {showRetypePassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
                {authError && (
                  <Alert severity="error" sx={{ mb: 2, mt: 2, width: '100%', textAlign: 'left' }}>
                    {authError.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </Alert>
                )}
                <FormControlLabel
                  control={
                    <IOSSwitch checked={agreeMailPromotions} onChange={(e: any) => setAgreeMailPromotions(e.target.checked)} sx={{ mr: '0.5rem' }} />
                  }
                  label="I'd like to receive promotional emails."
                  sx={{ mt: '1rem' }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleSignup}
                  sx={{ mt: '1rem', textAlign: 'center' }}
                >
                  Signup
                </Button>
                <Typography variant="subtitle2" sx={{ mt: '0.5rem' }}>
                  OR
                </Typography>
                <Button
                  fullWidth
                  onClick={loginWithGoogle}
                  sx={{
                    mt: '0.5rem',
                    textAlign: 'center',
                    display: 'flex', // Use flex display
                    alignItems: 'center', // Center vertically
                    justifyContent: 'center', // Center horizontally
                    padding: '0',
                    width: '55%',
                    ":hover": { backgroundColor: 'transparent' }
                  }}
                >
                  <img src={GoogleIcon} alt="Google" style={{ width: '100%' }} />
                </Button>
                <Typography variant="body2" sx={{ color: "#888", textAlign: "center", mb: '1rem', mt: '0.5rem' }}>
                  By registering, you agree to our{" "}
                  <Link component={RouterLink} to="/terms-and-conditions" color="inherit">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link component={RouterLink} to="/privacy-policy" color="inherit">
                    Privacy Policy
                  </Link>
                </Typography>
              </>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthPage;
