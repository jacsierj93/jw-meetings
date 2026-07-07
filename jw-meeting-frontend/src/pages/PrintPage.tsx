import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { PrintableProgram } from "../components/print/PrintableProgram";
import { fetchAssignmentsByWeek } from "../api/assignments";
import { useAppStore } from "../hooks/useAppStore";
import { useWeeks } from "../hooks/useWeeks";

export const PrintPage = () => {
  const activeProgramId = useAppStore((state) => state.activeProgramId);
  const { data: weeks = [], isLoading: isWeeksLoading } = useWeeks(activeProgramId);
  const orderedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.week_number - b.week_number),
    [weeks]
  );
  const [startWeekId, setStartWeekId] = useState<string | null>(null);
  const [endWeekId, setEndWeekId] = useState<string | null>(null);

  useEffect(() => {
    if (!startWeekId && orderedWeeks.length > 0) {
      setStartWeekId(orderedWeeks[0].id);
      setEndWeekId(orderedWeeks[0].id);
    }
  }, [orderedWeeks, startWeekId]);

  useEffect(() => {
    setStartWeekId(null);
    setEndWeekId(null);
  }, [activeProgramId]);

  useEffect(() => {
    if (!startWeekId || !endWeekId) {
      return;
    }
    const startExists = orderedWeeks.some((week) => week.id === startWeekId);
    const endExists = orderedWeeks.some((week) => week.id === endWeekId);
    if (!startExists || !endExists) {
      setStartWeekId(null);
      setEndWeekId(null);
    }
  }, [endWeekId, orderedWeeks, startWeekId]);

  const rangeWeeks = useMemo(() => {
    if (!startWeekId || !endWeekId) {
      return [];
    }
    const startIndex = orderedWeeks.findIndex((week) => week.id === startWeekId);
    const endIndex = orderedWeeks.findIndex((week) => week.id === endWeekId);
    if (startIndex === -1 || endIndex === -1) {
      return [];
    }
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    return orderedWeeks.slice(from, to + 1);
  }, [orderedWeeks, startWeekId, endWeekId]);

  const assignmentsQueries = useQueries({
    queries: rangeWeeks.map((week) => ({
      queryKey: ["assignments", week.id],
      queryFn: () => fetchAssignmentsByWeek(week.id),
      enabled: Boolean(week.id),
    })),
  });

  const assignmentsByWeek = useMemo(() => {
    const result: Record<string, Awaited<ReturnType<typeof fetchAssignmentsByWeek>>> = {};
    rangeWeeks.forEach((week, index) => {
      result[week.id] = assignmentsQueries[index]?.data ?? [];
    });
    return result;
  }, [assignmentsQueries, rangeWeeks]);

  return (
    <Stack gap={2}>
      <Typography variant="h4">Impresion</Typography>
      <Typography color="text.secondary">
        Prepara el programa con el formato exacto para imprimir.
      </Typography>
      {!activeProgramId ? (
        <Alert severity="warning">Selecciona un programa actual para imprimir.</Alert>
      ) : null}
      <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems="center">
        <FormControl sx={{ minWidth: 240 }} disabled={isWeeksLoading || !activeProgramId}>
          <InputLabel id="start-week-select">Semana inicio</InputLabel>
          <Select
            labelId="start-week-select"
            value={startWeekId ?? ""}
            label="Semana inicio"
            onChange={(event) => setStartWeekId(String(event.target.value))}
          >
            {orderedWeeks.map((week) => (
              <MenuItem key={week.id} value={week.id}>
                Semana {week.week_number} · {week.date_range}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 240 }} disabled={isWeeksLoading || !activeProgramId}>
          <InputLabel id="end-week-select">Semana fin</InputLabel>
          <Select
            labelId="end-week-select"
            value={endWeekId ?? ""}
            label="Semana fin"
            onChange={(event) => setEndWeekId(String(event.target.value))}
          >
            {orderedWeeks.map((week) => (
              <MenuItem key={week.id} value={week.id}>
                Semana {week.week_number} · {week.date_range}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => window.print()}
          disabled={rangeWeeks.length === 0}
        >
          Imprimir
        </Button>
      </Stack>
      {rangeWeeks.length === 0 ? (
        <Alert severity="info">Selecciona al menos una semana.</Alert>
      ) : (
        <PrintableProgram weeks={rangeWeeks} assignmentsByWeek={assignmentsByWeek} />
      )}
    </Stack>
  );
};
