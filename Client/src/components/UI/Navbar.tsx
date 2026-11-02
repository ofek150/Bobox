import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { FolderOpen, FolderUsers, User, LogOut } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

import { auth, logout } from '../../services/firebase';
import { ModeToggle } from '../ModeToggle';
import Logo from '../../assets/Logo.png';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'gap-2 text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-secondary text-secondary-foreground hover:bg-secondary'
    );

const Navbar: React.FC = () => {
    const [user] = useAuthState(auth);

    return (
        <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
                {/* Brand */}
                <Link to="/" className="flex items-center gap-2.5 rounded-lg font-semibold text-foreground">
                    <img src={Logo} alt="Bobox logo" className="h-9 w-9 rounded-lg" />
                    <span className="text-lg tracking-tight">Bobox</span>
                </Link>

                {/* Navigation */}
                {user ? (
                    <nav className="ml-4 flex items-center gap-1">
                        <Button variant="ghost" asChild>
                            <NavLink to="/user/folders/root" className={navItemClass}>
                                <FolderOpen />
                                <span className="hidden sm:inline">My files</span>
                            </NavLink>
                        </Button>
                        <Button variant="ghost" asChild>
                            <NavLink to="/user/folders/shared" className={navItemClass}>
                                <FolderUsers />
                                <span className="hidden sm:inline">Shared</span>
                            </NavLink>
                        </Button>
                        <Button variant="ghost" asChild>
                            <NavLink to="/account-info" className={navItemClass}>
                                <User />
                                <span className="hidden sm:inline">Account</span>
                            </NavLink>
                        </Button>
                    </nav>
                ) : null}

                <div className="ml-auto flex items-center gap-1">
                    <ModeToggle />
                    {user ? (
                        <Button variant="outline" onClick={() => logout()}>
                            <LogOut />
                            <span className="hidden sm:inline">Log out</span>
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link to="/login">Log in</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
