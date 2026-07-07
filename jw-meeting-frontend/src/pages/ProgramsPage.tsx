import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Link as RouterLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAppStore } from "../hooks/useAppStore";
import { useDeleteProgram, useDeleteWeek, usePrograms } from "../hooks/usePrograms";
import { useUpdateWeek } from "../hooks/useWeeks";
import { formatDate } from "../utils/formatters";
import { fetchWeeks } from "../api/programs";
import type { Week } from "../types/program";

export const ProgramsPage = () => {
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const activeProgramId = useAppStore((state) => state.activeProgramId);
  const setActiveProgramId = useAppStore((state) => state.setActiveProgramId);
  const { data = [], isLoading } = usePrograms(activeCongregationId);
  const deleteProgram = useDeleteProgram();
  const deleteWeek = useDeleteWeek();
  const updateWeek = useUpdateWeek();
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [viajante, setViajante] = useState(false);
  const [assemblyText, setAssemblyText] = useState("");

  const weeksQueries = useQueries({
    queries: data.map((program) => ({
      queryKey: ["weeks", program.id],
      queryFn: () => fetchWeeks(program.id),
      enabled: Boolean(program.id),
    })),
  });

  const weeksByProgramId = useMemo(() => {
    const result: Record<string, Week[]> = {};
    data.forEach((program, index) => {
      result[program.id] = (weeksQueries[index]?.data as Week[] | undefined) ?? [];
    });
    return result;
  }, [data, weeksQueries]);

  const mostRecentProgramId = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    const sorted = [...data].sort((a, b) => {
      const aTime = new Date(a.start_date).getTime();
      const bTime = new Date(b.start_date).getTime();
      return bTime - aTime;
    });
    return sorted[0]?.id ?? null;
  }, [data]);

  useEffect(() => {
    if (data.length === 0) {
      if (activeProgramId) {
        setActiveProgramId(null);
      }
      return;
    }
    if (!mostRecentProgramId) {
      return;
    }
    const activeExists = data.some((program) => program.id === activeProgramId);
    if (!activeProgramId || !activeExists) {
      setActiveProgramId(mostRecentProgramId);
    }
  }, [activeProgramId, data, mostRecentProgramId, setActiveProgramId]);

  const openWeekSettings = (week: Week) => {
    setEditingWeek(week);
    const extra = (week.extra_data ?? {}) as Record<string, unknown>;
    setViajante(Boolean(extra.viajante));
    setAssemblyText(String(extra.asamblea_conmemoracion ?? ""));
  };

  const handleSaveWeekSettings = () => {
    if (!editingWeek) {
      return;
    }
    const baseExtra = (editingWeek.extra_data ?? {}) as Record<string, unknown>;
    updateWeek.mutate(
      {
        weekId: editingWeek.id,
        programId: editingWeek.program_id,
        extra_data: {
          ...baseExtra,
          viajante,
          asamblea_conmemoracion: assemblyText.trim(),
        },
      },
      {
        onSuccess: () => {
          setEditingWeek(null);
        },
      }
    );
  };

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Typography variant="h4">Programas</Typography>
        <Button component={RouterLink} to="/import" variant="contained">
          Importar nuevo programa
        </Button>
      </Stack>
      {!activeCongregationId ? (
        <Alert severity="warning">
          Selecciona una congregacion activa para visualizar programas.
        </Alert>
      ) : null}
      {isLoading ? (
        <Typography>Cargando...</Typography>
      ) : data.length === 0 ? (
        <Typography color="text.secondary">No hay programas importados.</Typography>
      ) : (
        <Stack gap={2}>
          {data.map((program) => {
            const weeks = weeksByProgramId[program.id] ?? [];
            return (
              <Accordion key={program.id} sx={{ borderRadius: 4 }} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    gap={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    sx={{ width: "100%" }}
                  >
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {formatDate(program.start_date)} - {formatDate(program.end_date)}
                    </Typography>
                    {program.id === activeProgramId ? (
                      <Chip label="Actual" color="secondary" />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveProgramId(program.id);
                        }}
                      >
                        Marcar actual
                      </Button>
                    )}
                    <IconButton
                      aria-label="Eliminar programa"
                      onClick={(event) => {
                        event.stopPropagation();
                        const confirmed = window.confirm(
                          "Este programa se eliminara junto con sus semanas. ¿Deseas continuar?"
                        );
                        if (!confirmed) {
                          return;
                        }
                        deleteProgram.mutate(program.id);
                      }}
                    >
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {weeks.length === 0 ? (
                    <Typography color="text.secondary">No hay semanas disponibles.</Typography>
                  ) : (
                    <Stack gap={1}>
                      {weeks
                        .slice()
                        .sort((a, b) => a.week_number - b.week_number)
                        .map((week) => (
                          <Stack
                            key={week.id}
                            direction={{ xs: "column", sm: "row" }}
                            gap={1}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: "1px solid rgba(30, 95, 116, 0.12)",
                            }}
                          >
                            <Stack sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle2">
                                Semana {week.week_number} - {week.date_range}
                              </Typography>
                              {week.reading ? (
                                <Typography variant="caption" color="text.secondary">
                                  Lectura: {week.reading}
                                </Typography>
                              ) : null}
                            </Stack>
                            <IconButton
                              aria-label="Editar semana"
                              onClick={() => {
                                openWeekSettings(week);
                              }}
                            >
                              <SettingsRoundedIcon />
                            </IconButton>
                            <IconButton
                              aria-label="Eliminar semana"
                              onClick={() => {
                                const confirmed = window.confirm(
                                  "Esta semana se eliminara junto con sus asignaciones. ¿Deseas continuar?"
                                );
                                if (!confirmed) {
                                  return;
                                }
                                deleteWeek.mutate({
                                  weekId: week.id,
                                  programId: program.id,
                                });
                              }}
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </Stack>
                        ))}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
      <Dialog
        open={Boolean(editingWeek)}
        onClose={() => {
          if (!updateWeek.isLoading) {
            setEditingWeek(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configuracion de semana</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editingWeek ? (
            <Typography variant="subtitle2" color="text.secondary">
              Semana {editingWeek.week_number} - {editingWeek.date_range}
            </Typography>
          ) : null}
          <FormControlLabel
            control={
              <Switch
                checked={viajante}
                onChange={(event) => setViajante(event.target.checked)}
              />
            }
            label="Visita del superintendente de circuito"
          />
          <TextField
            label="Asamblea o conmemoracion"
            placeholder="Texto a mostrar en el programa"
            value={assemblyText}
            onChange={(event) => setAssemblyText(event.target.value)}
            multiline
            minRows={2}
          />
          <Typography variant="caption" color="text.secondary">
            Si hay texto de asamblea o conmemoracion, la semana queda bloqueada para
            asignaciones.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setEditingWeek(null)}
            disabled={updateWeek.isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveWeekSettings}
            disabled={updateWeek.isLoading}
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};


