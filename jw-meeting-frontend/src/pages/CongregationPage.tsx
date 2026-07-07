import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useCongregations, useCreateCongregation } from "../hooks/useCongregations";
import { useAppStore } from "../hooks/useAppStore";

export const CongregationPage = () => {
  const { data = [], isLoading } = useCongregations();
  const createCongregation = useCreateCongregation();
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const setActiveCongregationId = useAppStore((state) => state.setActiveCongregationId);
  const setActiveCongregationName = useAppStore((state) => state.setActiveCongregationName);

  const [name, setName] = useState("");
  const [settings, setSettings] = useState("{\n  \"timezone\": \"America/Argentina/Buenos_Aires\"\n}");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCongregationId && data.length > 0) {
      setActiveCongregationId(data[0].id);
      setActiveCongregationName(data[0].name);
    }
  }, [activeCongregationId, data, setActiveCongregationId, setActiveCongregationName]);

  const activeCongregation = useMemo(
    () => data.find((item) => item.id === activeCongregationId),
    [data, activeCongregationId]
  );

  const handleSave = async () => {
    setError(null);
    try {
      const parsedSettings = settings ? JSON.parse(settings) : undefined;
      const created = await createCongregation.mutateAsync({ name, settings: parsedSettings });
      setActiveCongregationId(created.id);
      setActiveCongregationName(created.name);
      setName("");
    } catch (err) {
      setError("El JSON de configuracion no es valido.");
    }
  };

  return (
    <Stack gap={3}>
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack gap={2}>
            <Typography variant="h4">Configuracion de congregacion</Typography>
            <Typography color="text.secondary">
              Define los datos base para administrar los programas y personas.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mayor Buratovich"
              fullWidth
            />
            <TextField
              label="Configuracion adicional (JSON)"
              value={settings}
              onChange={(event) => setSettings(event.target.value)}
              minRows={6}
              multiline
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!name || createCongregation.isPending}
            >
              Guardar congregacion
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack gap={2}>
            <Typography variant="h5">Congregaciones existentes</Typography>
            <Divider />
            {isLoading ? (
              <Typography>Cargando...</Typography>
            ) : data.length === 0 ? (
              <Typography color="text.secondary">No hay congregaciones cargadas.</Typography>
            ) : (
              <Stack gap={2}>
                {data.map((congregation) => (
                  <Box
                    key={congregation.id}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: "1px solid rgba(30, 95, 116, 0.12)",
                      background:
                        congregation.id === activeCongregationId
                          ? "rgba(243, 180, 49, 0.15)"
                          : "transparent",
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="center">
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{congregation.name}</Typography>
                      </Box>
                      <Button variant="outlined" disabled>
                        {congregation.id === activeCongregationId ? "Activa" : "No activa"}
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
      {activeCongregation ? (
        <Alert severity="success">
          Congregacion activa: {activeCongregation.name}
        </Alert>
      ) : null}
    </Stack>
  );
};
