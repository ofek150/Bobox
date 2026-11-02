import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";

import {
  auth,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  signInWithGoogle,
} from "../services/firebase";
import { isValidEmail, isValidName } from "../utils/validations";
import { toFriendlyMessage } from "../utils/errors";
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator";
import { GoogleIcon } from "../components/UI/GoogleIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AuthPageProps {
  initialTab: number; // 0 for login, 1 for signup
}

/** Text input with a leading icon, styled like the rest of the app. */
const IconInput: React.FC<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
} & React.ComponentProps<"input">> = ({ id, label, icon: Icon, trailing, className, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        className={cn("pr-9 pl-8", trailing && "pr-16", className)}
        {...props}
      />
      {trailing && (
        <span className="absolute top-1/2 right-1 -translate-y-1/2">{trailing}</span>
      )}
    </div>
  </div>
);

/** Password input with a show/hide toggle. */
const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  autoComplete: string;
}> = ({ id, label, value, onChange, onSubmit, autoComplete }) => {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      id={id}
      label={label}
      icon={Lock}
      type={visible ? "text" : "password"}
      value={value}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => { if (event.key === "Enter") onSubmit?.(); }}
      trailing={
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((prev) => !prev)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
};

const GoogleButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <Button variant="outline" onClick={onClick} disabled={disabled} className="w-full">
    <GoogleIcon className="size-4.5" />
    Continue with Google
  </Button>
);

const AuthPage: React.FC<AuthPageProps> = ({ initialTab }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab === 0 ? "login" : "signup");
  const [authError, setAuthError] = useState<string | null>(null);
  const [agreeMailPromotions, setAgreeMailPromotions] = useState(false);

  useEffect(() => {
    if (user) {
      const intendedDestination = location.state?.from || "/";
      navigate(intendedDestination);
    }
  }, [user, loading, navigate, location.state?.from]);

  useEffect(() => {
    const initialTabFromLocation = location.state?.initialTab;
    if (initialTabFromLocation !== undefined) {
      setActiveTab(initialTabFromLocation === 0 ? "login" : "signup");
    }
  }, [location.state]);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      // On success the useAuthState effect navigates; keep the spinner on.
    } catch (error: any) {
      setAuthError(toFriendlyMessage(error, "Google sign-in failed. Please try again."));
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;
    setAuthError(null);
    setIsLoading(true);
    try {
      await loginWithEmailAndPassword(email, password);
      // On success the useAuthState effect navigates; keep the spinner on.
    } catch (error: any) {
      setAuthError(toFriendlyMessage(error, "Incorrect email or password."));
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (isLoading) return;
    if (password !== retypePassword) {
      setAuthError("Passwords do not match. Please retype your password correctly.");
      return;
    }
    setAuthError(null);
    try {
      setIsLoading(true);
      await registerWithEmailAndPassword(name, email, password, agreeMailPromotions);
      await handleLogin();
    } catch (error: any) {
      setAuthError(toFriendlyMessage(error));
      setIsLoading(false);
    }
  };

  const switchTab = (value: string) => {
    setActiveTab(value);
    setAuthError(null);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-2">
          <Tabs value={activeTab} onValueChange={switchTab}>
            <TabsList className="w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="flex flex-col gap-4">
              <IconInput
                id="login-email"
                label="Email address"
                icon={Mail}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={email !== "" && !isValidEmail(email)}
              />
              <PasswordField
                id="login-password"
                label="Password"
                value={password}
                autoComplete="current-password"
                onChange={setPassword}
                onSubmit={handleLogin}
              />
              <div className="flex justify-end -mt-1">
                <RouterLink to="/reset-password" className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground">
                  Forgot your password?
                </RouterLink>
              </div>

              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                Login
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <GoogleButton onClick={loginWithGoogle} disabled={isLoading} />
            </TabsContent>

            <TabsContent value="signup" className="flex flex-col gap-4">
              <IconInput
                id="signup-name"
                label="Name"
                icon={User}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={name !== "" && !isValidName(name)}
              />
              <IconInput
                id="signup-email"
                label="Email address"
                icon={Mail}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={email !== "" && !isValidEmail(email)}
              />
              <div className="flex flex-col gap-1.5">
                <PasswordField
                  id="signup-password"
                  label="Password"
                  value={password}
                  autoComplete="new-password"
                  onChange={setPassword}
                />
                {password !== "" && <PasswordStrengthIndicator password={password} />}
              </div>
              <PasswordField
                id="signup-retype"
                label="Retype password"
                value={retypePassword}
                autoComplete="new-password"
                onChange={setRetypePassword}
                onSubmit={handleSignup}
              />

              <div className="flex items-center gap-3">
                <Switch
                  id="mail-promotions"
                  checked={agreeMailPromotions}
                  onCheckedChange={setAgreeMailPromotions}
                />
                <Label htmlFor="mail-promotions" className="text-sm font-normal text-muted-foreground">
                  I'd like to receive promotional emails.
                </Label>
              </div>

              {authError && (
                <Alert variant="destructive">
                  <AlertDescription className="whitespace-pre-line">{authError}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleSignup} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                Create account
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <GoogleButton onClick={loginWithGoogle} disabled={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
