import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import StyleRoundedIcon from "@mui/icons-material/StyleRounded";

export const navItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: <DashboardRoundedIcon />,
  },
  {
    label: "Congregacion",
    path: "/congregation",
    icon: <HomeWorkRoundedIcon />,
  },
  {
    label: "Personas",
    path: "/persons",
    icon: <PeopleAltRoundedIcon />,
  },
  {
    label: "Programas",
    path: "/programs",
    icon: <EventNoteRoundedIcon />,
  },
  {
    label: "Importar",
    path: "/import",
    icon: <FileUploadRoundedIcon />,
  },
  {
    label: "Asignaciones",
    path: "/assignments",
    icon: <ViewListRoundedIcon />,
  },
  {
    label: "Imprimir",
    path: "/print",
    icon: <PrintRoundedIcon />,
  },
  {
    label: "Tarjetas",
    path: "/print-cards",
    icon: <StyleRoundedIcon />,
  },
];
