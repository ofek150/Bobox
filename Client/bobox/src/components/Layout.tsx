import React from "react";
import { Outlet } from "react-router-dom";

const Layout: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* <Navbar /> */}
            <Outlet />
        </div>
    )
}

export default Layout;