import { HardDrive, LogOut, Mail, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { auth, getUserData, logout } from '../services/firebase';
import Loading from '../components/Loading';
import { formatFileSize } from '../utils/helpers';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface AccountInfo {
    name: string;
    email: string;
    totalFileSize: number;
    agreeMailToPromotions: boolean;
    maxTotalFileSize: number;
}

const AccountInformation: React.FC = () => {
    const [user] = useAuthState(auth);
    const [loading, setLoading] = useState(true);
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        if (user) {
            const userData = await getUserData(user.uid);
            if (!userData) {
                handleError('Failed to fetch user information');
                navigate('/');
                return;
            }
            setAccountInfo({
                name: userData?.name,
                email: userData?.email,
                totalFileSize: userData?.totalFileSize,
                agreeMailToPromotions: userData?.agreeMailToPromotions,
                maxTotalFileSize: userData?.maxTotalFileSize,
            });
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        if (accountInfo) setLoading(false);
    }, [accountInfo]);

    const handleLogout = () => {
        logout();
    };

    const handleError = (error: string | null = null) => {
        console.error(error);
        toast.error(error);
    };

    if (loading) return <Loading />;

    const usagePercent = accountInfo
        ? Math.min(100, (accountInfo.totalFileSize / accountInfo.maxTotalFileSize) * 100)
        : 0;

    return (
        <div className="mx-auto w-full max-w-md px-4 py-8">
            {accountInfo && (
                <Card>
                    <CardHeader className="flex-row items-center gap-4">
                        <Avatar className="size-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                                {accountInfo.name?.trim()?.charAt(0).toUpperCase() || <User className="size-5" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <CardTitle className="truncate text-xl">{accountInfo.name}</CardTitle>
                            <p className="truncate text-sm text-muted-foreground">{accountInfo.email}</p>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground">Name</Label>
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    <User className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{accountInfo.name}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground">Email</Label>
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{accountInfo.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <HardDrive className="size-4 text-muted-foreground" />
                                    Storage
                                </span>
                                <span className="text-muted-foreground">
                                    {formatFileSize(accountInfo.totalFileSize)} / {formatFileSize(accountInfo.maxTotalFileSize)}
                                    {' · '}{usagePercent.toFixed(1)}%
                                </span>
                            </div>
                            <Progress value={usagePercent} />
                        </div>

                        <Button variant="secondary" onClick={handleLogout} className="w-full">
                            <LogOut />
                            Log out
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AccountInformation;
