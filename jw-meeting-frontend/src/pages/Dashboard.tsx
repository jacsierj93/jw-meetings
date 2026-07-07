import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { useAppStore } from "../hooks/useAppStore";
import { useCongregations } from "../hooks/useCongregations";
import { usePrograms } from "../hooks/usePrograms";
import { useWeeks } from "../hooks/useWeeks";
import { fetchAssignmentsByWeek } from "../api/assignments";
import { formatDate } from "../utils/formatters";
import type { Assignment } from "../types/assignment";

export const Dashboard = () => {
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const activeCongregationName = useAppStore((state) => state.activeCongregationName);
  const activeProgramId = useAppStore((state) => state.activeProgramId);
  const { data: congregations = [] } = useCongregations();
  const { data: programs = [] } = usePrograms(activeCongregationId);
  const { data: weeks = [] } = useWeeks(activeProgramId);

  const congregationLabel =
    activeCongregationName ||
    congregations.find((item) => item.id === activeCongregationId)?.name ||
    "Sin definir";

  const activeProgram = programs.find((program) => program.id === activeProgramId) ?? null;

  const orderedWeeks = useMemo(
    () => [...weeks].sort((a, b) => new Date(a.week_date).getTime() - new Date(b.week_date).getTime()),
    [weeks]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingWeeks = useMemo(() => {
    const upcoming = orderedWeeks.filter(
      (week) => new Date(week.week_date).getTime() >= today.getTime()
    );
    if (upcoming.length > 0) {
      return upcoming.slice(0, 3);
    }
    return orderedWeeks.slice(-3);
  }, [orderedWeeks, today]);

  const upcomingQueries = useQueries({
    queries: upcomingWeeks.map((week) => ({
      queryKey: ["assignments", week.id],
      queryFn: () => fetchAssignmentsByWeek(week.id),
      enabled: Boolean(week.id),
    })),
  });

  const assignmentsByWeek = useMemo(() => {
    const result: Record<string, Assignment[]> = {};
    upcomingWeeks.forEach((week, index) => {
      result[week.id] = upcomingQueries[index]?.data ?? [];
    });
    return result;
  }, [upcomingQueries, upcomingWeeks]);

  const nextWeek = upcomingWeeks[0] ?? orderedWeeks[0] ?? null;
  const nextWeekAssignments = nextWeek ? assignmentsByWeek[nextWeek.id] ?? [] : [];
  const pendingCount = nextWeekAssignments.filter((item) => !item.assignee).length;

  const stats = [
    {
      label: "Congregacion activa",
      value: congregationLabel,
      detail: activeCongregationId ? "Configurada" : "Configura la congregacion",
    },
    {
      label: "Programa actual",
      value: activeProgram
        ? `${formatDate(activeProgram.start_date)} - ${formatDate(activeProgram.end_date)}`
        : "Sin programa",
      detail: activeProgram ? `${weeks.length} semanas cargadas` : "Importa un EPUB",
    },
    {
      label: "Asignaciones pendientes",
      value: String(pendingCount),
      detail: nextWeek ? `Semana ${nextWeek.week_number}` : "Sin semanas disponibles",
    },
  ];

  const quickActions = [
    { label: "Configurar congregacion", to: "/congregation" },
    { label: "Importar programa", to: "/import" },
    { label: "Ver asignaciones", to: "/assignments" },
  ];

  return (
    <Stack gap={4}>
      <Card sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
        <CardContent sx={{ p: 0 }}>
          <Stack gap={2}>
            <Typography variant="subtitle2">Bienvenido</Typography>
            <Typography variant="h3">Panel de control del programa</Typography>
            <Typography color="text.secondary">
              Gestiona congregaciones, personas, programas y asignaciones en un solo flujo.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              {quickActions.map((action) => (
                <Button
                  key={action.to}
                  component={RouterLink}
                  to={action.to}
                  variant="contained"
                  color="primary"
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {stats.map((item) => (
          <Card key={item.label} sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {item.value}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {item.detail}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack gap={2}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems="center">
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Proximas semanas
              </Typography>
              {nextWeek ? <Chip label={`Semana ${nextWeek.week_number}`} /> : null}
            </Stack>
            <Divider />
            {upcomingWeeks.length === 0 ? (
              <Typography color="text.secondary">No hay semanas disponibles.</Typography>
            ) : (
              <Stack gap={1.5}>
                {upcomingWeeks.map((week) => {
                  const assignments = assignmentsByWeek[week.id] ?? [];
                  const pending = assignments.filter((item) => !item.assignee).length;
                  return (
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
                      <Chip
                        label={`${pending} pendientes`}
                        color={pending > 0 ? "warning" : "success"}
                        size="small"
                      />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
