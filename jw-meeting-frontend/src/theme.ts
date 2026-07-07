import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1E5F74",
      dark: "#1A4E5F",
      light: "#4A7E8E",
    },
    secondary: {
      main: "#F3B431",
      dark: "#C68B25",
      light: "#F7C865",
    },
    background: {
      default: "#F6F1E9",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1F1F1F",
      secondary: "#4B4B4B",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontWeight: 600,
      letterSpacing: "-0.02em",
    },
    h4: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
    subtitle2: {
      fontFamily: '"IBM Plex Mono", "Courier New", monospace',
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(30, 95, 116, 0.08)",
          boxShadow: "0 16px 40px rgba(30, 95, 116, 0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
    },
  },
});
