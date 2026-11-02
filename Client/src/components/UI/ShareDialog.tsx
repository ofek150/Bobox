import React, { useEffect, useState } from 'react';
import { Check, Copy, Link as LinkIcon, Loader2 } from 'lucide-react';

import { ACCESS_LEVEL } from '../../utils/constants';
import { isValidEmail } from '../../utils/validations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/errors';

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Folders only support collaborators; files can also get a public link. */
    allowPublicLink?: boolean;
    onInvite: (email: string, accessLevel: ACCESS_LEVEL) => void;
    onGenerateLink?: (neverExpires: boolean, expiresAt: Date | null) => Promise<{ link?: string; error?: string }>;
}

const EXPIRY_DAYS = [1, 2, 3, 4, 5, 6, 7];

const ShareDialog: React.FC<ShareDialogProps> = ({
    open,
    onOpenChange,
    allowPublicLink = false,
    onInvite,
    onGenerateLink,
}) => {
    const [email, setEmail] = useState('');
    const [accessLevel, setAccessLevel] = useState<ACCESS_LEVEL>(ACCESS_LEVEL.VIEWER);
    const [neverExpires, setNeverExpires] = useState(false);
    const [expiryDays, setExpiryDays] = useState(7);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) {
            setEmail('');
            setAccessLevel(ACCESS_LEVEL.VIEWER);
            setNeverExpires(false);
            setExpiryDays(7);
            setShareLink(null);
            setCopied(false);
        }
    }, [open]);

    const handleInvite = () => {
        if (!isValidEmail(email)) {
            toast.error(`Invalid email address: ${email}`);
            return;
        }
        onInvite(email, accessLevel);
        onOpenChange(false);
    };

    const handleGenerateLink = async () => {
        if (!onGenerateLink) return;
        setGenerating(true);
        const expiresAt = neverExpires
            ? null
            : (() => {
                const date = new Date();
                date.setDate(date.getDate() + expiryDays);
                return date;
            })();
        const { link, error } = await onGenerateLink(neverExpires, expiresAt);
        setGenerating(false);
        if (error) {
            toast.error(error);
            return;
        }
        if (link) setShareLink(link);
    };

    const handleCopy = async () => {
        if (!shareLink) return;
        if (await copyToClipboard(shareLink)) {
            setCopied(true);
            toast.success('Link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast('Copy failed — select the link text and copy it manually.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-5 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Share</DialogTitle>
                    <DialogDescription>
                        Invite people by email, or create a public link anyone can open.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="share-email">Email</Label>
                        <Input
                            id="share-email"
                            type="email"
                            inputMode="email"
                            autoComplete="off"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleInvite(); }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Access level</Label>
                        <Select value={String(accessLevel)} onValueChange={(value) => setAccessLevel(Number(value) as ACCESS_LEVEL)}>
                            <SelectTrigger className="w-full" aria-label="Access level">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(ACCESS_LEVEL.ADMIN)}>Admin</SelectItem>
                                <SelectItem value={String(ACCESS_LEVEL.OPERATOR)}>Operator</SelectItem>
                                <SelectItem value={String(ACCESS_LEVEL.VIEWER)}>Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Admins manage collaborators, operators can upload and edit, viewers can only read.
                        </p>
                    </div>

                    <Button onClick={handleInvite} className="self-start">
                        Invite collaborator
                    </Button>
                </div>

                {allowPublicLink && (
                    <>
                        <Separator />
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                                <Label htmlFor="never-expires" className="font-medium">Link never expires</Label>
                                <Switch id="never-expires" checked={neverExpires} onCheckedChange={(checked) => setNeverExpires(checked)} />
                            </div>

                            {!neverExpires && !shareLink && (
                                <div className="flex flex-col gap-2">
                                    <Label>Link is valid for</Label>
                                    <Select value={String(expiryDays)} onValueChange={(value) => setExpiryDays(Number(value))}>
                                        <SelectTrigger className="w-full" aria-label="Link expiry">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPIRY_DAYS.map((days) => (
                                                <SelectItem key={days} value={String(days)}>{days} day{days === 1 ? '' : 's'}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {!shareLink && (
                                <Button variant="secondary" onClick={handleGenerateLink} disabled={generating} className="self-start">
                                    {generating ? <Loader2 className="animate-spin" /> : <LinkIcon />}
                                    Generate public link
                                </Button>
                            )}

                            {shareLink && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        Anyone with this link can view the file.
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input readOnly value={shareLink} aria-label="Public link" className="text-xs" onFocus={(event) => event.target.select()} />
                                        <Button onClick={handleCopy} variant={copied ? 'secondary' : 'default'} className="shrink-0">
                                            {copied ? <Check /> : <Copy />}
                                            {copied ? 'Copied' : 'Copy link'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShareDialog;
