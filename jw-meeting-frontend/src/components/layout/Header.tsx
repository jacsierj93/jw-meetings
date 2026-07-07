import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { useLocation } from "react-router-dom";
import { navItems } from "./navItems";
import { useAppStore } from "../../hooks/useAppStore";
import { useCongregations } from "../../hooks/useCongregations";

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header = ({ onOpenSidebar }: HeaderProps) => {
  const location = useLocation();
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const { data = [] } = useCongregations();
  const activeCongregationName =
    data.find((item) => item.id === activeCongregationId)?.name ?? null;
  const activeLabel =
    navItems.find((item) => item.path === location.pathname)?.label ?? "Dashboard";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        width: "100%",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: "rgba(246, 241, 233, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30, 95, 116, 0.08)",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: 72 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onOpenSidebar}
          sx={{ display: { md: "none" } }}
        >
          <MenuRoundedIcon />
        </IconButton>
        <Stack>
          <Typography variant="subtitle2">Panel Principal</Typography>
          <Typography variant="h5">{activeLabel}</Typography>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        {activeCongregationId ? (
          <Chip
            label={`Congregacion activa: ${activeCongregationName ?? activeCongregationId}`}
            variant="outlined"
            sx={{ borderRadius: 3 }}
          />
        ) : (
          <Chip label="Sin congregacion activa" variant="outlined" sx={{ borderRadius: 3 }} />
        )}
      </Toolbar>
    </AppBar>
  );
};
