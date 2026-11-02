import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { confirmPasswordReset } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import { auth, loginWithEmailAndPassword } from '../services/firebase';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { isValidPassword } from '../utils/validations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResetPasswordFormProps {
  actionCode: string;
  accountEmail: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ actionCode, accountEmail }) => {
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    try {
      setIsResetting(true);
      if (!isValidPassword(newPassword)) {
        setPasswordError('Your password must meet the following requirements:\n' +
          '* Must be at least 8 characters long\n' +
          '* Must include at least two of the following:\n' +
          '  - Uppercase letter\n' +
          '  - Lowercase letter\n' +
          '  - Number\n' +
          '  - Special character such as @, $, or !');
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
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Reset password</CardTitle>
          <CardDescription className="text-center">
            Choose a new password for <span className="font-medium text-foreground">{accountEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-16 pl-8"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((prev) => !prev)}
                className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {newPassword !== '' && <PasswordStrengthIndicator password={newPassword} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retype-password">Retype password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="retype-password"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                className="pl-8"
                value={retypePassword}
                onChange={(event) => setRetypePassword(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleResetPassword(); }}
              />
            </div>
          </div>

          {passwordError && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-line">{passwordError}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleResetPassword} disabled={isResetting} className="w-full">
            {isResetting ? <Loader2 className="animate-spin" /> : null}
            Reset password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordForm;
