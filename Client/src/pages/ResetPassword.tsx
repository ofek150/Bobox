import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";

import { auth, sendPasswordReset } from "../services/firebase";
import { isValidEmail } from "../utils/validations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        if (!isValidEmail(email)) {
            setResetError("Invalid email format. Please enter a valid email address.");
            return;
        }

        try {
            setIsLoading(true);
            await sendPasswordReset(email);
            setIsLoading(false);
            setResetError(null);
            setDialogOpen(true);
        } catch (error) {
            console.error("Password reset error:", error);
            setIsLoading(false);
            setResetError("Failed to send password reset email. Please check your email address and try again.");
        }
    };

    return (
        <div className="flex flex-1 items-center justify-center px-4 py-10">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Reset password</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email and we'll send you a link to choose a new password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="relative">
                        <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Label htmlFor="reset-email" className="sr-only">Email address</Label>
                        <Input
                            id="reset-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            className="pl-8"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter") handleResetPassword(); }}
                            aria-invalid={resetError !== null}
                        />
                    </div>

                    {resetError && (
                        <Alert variant="destructive">
                            <AlertDescription>{resetError}</AlertDescription>
                        </Alert>
                    )}

                    <Button onClick={handleResetPassword} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : null}
                        Send reset email
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                            Register now
                        </Link>
                    </p>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset email sent</DialogTitle>
                        <DialogDescription>
                            An account with the email address "{email}" is associated with us.
                            Instructions to reset the password have been sent to this email address.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setDialogOpen(false)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ResetPassword;
