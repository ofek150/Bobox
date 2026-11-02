import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./UI/Navbar";

const Layout: React.FC = () => {
    const location = useLocation();
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Navbar />
            {/* Keyed by path so each page gets its fade-rise entrance. */}
            <main key={location.pathname} className="animate-page-in flex-1">
                <Outlet />
            </main>
        </div>
    )
}

export default Layout;
