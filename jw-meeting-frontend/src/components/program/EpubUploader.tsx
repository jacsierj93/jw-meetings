import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../hooks/useAppStore";
import { useCongregations } from "../../hooks/useCongregations";
import { useImportProgram } from "../../hooks/usePrograms";

export const EpubUploader = () => {
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const setActiveProgramId = useAppStore((state) => state.setActiveProgramId);
  const importProgram = useImportProgram();
  const { data = [] } = useCongregations();
  const activeCongregationName =
    data.find((item) => item.id === activeCongregationId)?.name ?? null;
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    setFile(selected ?? null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/epub+zip": [".epub"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!activeCongregationId) {
      setError("Selecciona una congregacion activa.");
      return;
    }
    if (!file) {
      setError("Selecciona un archivo EPUB.");
      return;
    }
    setError(null);
    const payload = new FormData();
    payload.append("file", file);
    payload.append("congregation_id", activeCongregationId);
    try {
      const program = await importProgram.mutateAsync(payload);
      setActiveProgramId(program.id);
      enqueueSnackbar("Programa importado correctamente.", { variant: "success" });
      navigate("/assignments");
    } catch (err) {
      setError("No se pudo importar el EPUB. Revisa el archivo e intenta nuevamente.");
      enqueueSnackbar("Error al importar el programa.", { variant: "error" });
    }
    setFile(null);
  };

  return (
    <Stack gap={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {importProgram.isPending ? <LinearProgress sx={{ borderRadius: 999 }} /> : null}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack gap={2}>
            <Typography variant="h5">Importar programa desde EPUB</Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: "1px dashed rgba(30, 95, 116, 0.4)",
                borderRadius: 4,
                p: 4,
                textAlign: "center",
                background: isDragActive ? "rgba(30, 95, 116, 0.08)" : "#fff",
                cursor: "pointer",
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadRoundedIcon fontSize="large" />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {file ? file.name : "Arrastra o haz click para seleccionar"}
              </Typography>
              <Typography color="text.secondary">Solo archivos .epub</Typography>
            </Box>
            <TextField
              label="Congregacion activa"
              value={activeCongregationName ?? "No seleccionada"}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importProgram.isPending}
            >
              Importar programa
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
