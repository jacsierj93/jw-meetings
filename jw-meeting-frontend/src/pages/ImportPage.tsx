import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EpubUploader } from "../components/program/EpubUploader";

export const ImportPage = () => {
  return (
    <Stack gap={2}>
      <Typography variant="h4">Importacion de programas</Typography>
      <Typography color="text.secondary">
        Sube el EPUB oficial y genera las semanas con sus asignaciones.
      </Typography>
      <EpubUploader />
    </Stack>
  );
};
