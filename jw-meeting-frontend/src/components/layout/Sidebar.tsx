import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { NavLink } from "react-router-dom";
import { navItems } from "./navItems";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  width: number;
}

const linkStyles = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  color: "inherit",
  width: "100%",
  display: "block",
  borderRadius: 16,
  background: isActive ? "rgba(30, 95, 116, 0.12)" : "transparent",
});

export const Sidebar = ({ width }: { width: number }) => {
  const content = (
    <Stack gap={3} sx={{ p: 3 }}>
      <Stack gap={0.5}>
        <Typography variant="subtitle2">JW Meeting</Typography>
        <Typography variant="h5">Control Central</Typography>
      </Stack>
      <List sx={{ display: "grid", gap: 1.2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <NavLink to={item.path} style={linkStyles}>
              <ListItemButton sx={{ borderRadius: 3, py: 1.2, px: 1.4 }}>
                <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </NavLink>
          </ListItem>
        ))}
      </List>
    </Stack>
  );

  return (
    <Box
      component="aside"
      sx={{
        display: { xs: "none", md: "block" },
        width,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid rgba(30, 95, 116, 0.08)",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F2EA 100%)",
        overflowY: "auto",
      }}
    >
      {content}
    </Box>
  );
};

export const MobileSidebar = ({ mobileOpen, onClose, width }: SidebarProps) => {
  const content = (
    <Stack gap={3} sx={{ p: 3 }}>
      <Stack gap={0.5}>
        <Typography variant="subtitle2">JW Meeting</Typography>
        <Typography variant="h5">Control Central</Typography>
      </Stack>
      <List sx={{ display: "grid", gap: 1.2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <NavLink to={item.path} style={linkStyles}>
              <ListItemButton sx={{ borderRadius: 3, py: 1.2, px: 1.4 }}>
                <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </NavLink>
          </ListItem>
        ))}
      </List>
    </Stack>
  );

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": { boxSizing: "border-box", width },
      }}
    >
      {content}
    </Drawer>
  );
};
