import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./UI/Navbar";

const Layout: React.FC = () => {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    )
}

export default Layout;
