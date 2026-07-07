import Box from "@mui/material/Box";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar, MobileSidebar } from "./Sidebar";

const drawerWidth = 280;

export const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: `${drawerWidth}px 1fr` },
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {/* Mobile Sidebar (Drawer) */}
      <MobileSidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} width={drawerWidth} />

      {/* Desktop Sidebar (Aside) */}
      <Sidebar width={drawerWidth} />

      {/* Main Container Area */}
      <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header onOpenSidebar={handleDrawerToggle} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            background:
              "radial-gradient(circle at top, rgba(30, 95, 116, 0.08) 0%, rgba(246, 241, 233, 0) 45%)",
            px: { xs: 2.5, md: 6 },
            py: 4,
            overflowX: "hidden",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
