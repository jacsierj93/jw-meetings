import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { GridView } from "../components/assignments/GridView";
import { MatrixView } from "../components/assignments/MatrixView";
import { ProgramView } from "../components/assignments/ProgramView";
import {
  useAssignments,
  useReassignAssignment,
  useUnassignAssignment,
  useUpdateAssistant,
} from "../hooks/useAssignments";
import { useAppStore } from "../hooks/useAppStore";
import { usePersons } from "../hooks/usePersons";
import { useWeeks } from "../hooks/useWeeks";
import { usePrograms } from "../hooks/usePrograms";
import { fetchAssignmentsByWeek } from "../api/assignments";
import { fetchWeeks } from "../api/programs";
import {
  canAssignPersonToAssignmentInWeek,
  countAssignmentsForPerson,
  getAssignmentBlockReason,
  isExcludedFromLoadCount,
  isPersonAbsentOnWeek,
} from "../utils/assignmentRules";

const views = [{ label: "Grid" }, { label: "Matriz" }, { label: "Programa" }];

export const AssignmentsPage = () => {
  const [tab, setTab] = useState(0);
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const activeProgramId = useAppStore((state) => state.activeProgramId);
  const { data: persons = [] } = usePersons(activeCongregationId);
  const { data: programs = [] } = usePrograms(activeCongregationId);
  const { data: weeks = [], isLoading: isWeeksLoading } = useWeeks(activeProgramId);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const { data: assignments = [], isLoading: isAssignmentsLoading } =
    useAssignments(selectedWeekId);
  const reassign = useReassignAssignment();
  const updateAssistant = useUpdateAssistant();
  const unassign = useUnassignAssignment();
  const { enqueueSnackbar } = useSnackbar();

  const orderedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.week_number - b.week_number),
    [weeks]
  );

  const programWeeksQueries = useQueries({
    queries: programs.map((program) => ({
      queryKey: ["weeks", program.id],
      queryFn: () => fetchWeeks(program.id),
      enabled: Boolean(program.id),
    })),
  });

  const allWeeks = useMemo(() => {
    if (programs.length === 0) {
      return [];
    }
    return programs.flatMap((program, index) => programWeeksQueries[index]?.data ?? []);
  }, [programWeeksQueries, programs]);

  const orderedMatrixWeeks = useMemo(() => {
    if (allWeeks.length === 0) {
      return [];
    }
    return [...allWeeks].sort((a, b) => {
      const aTime = a.week_date ? new Date(a.week_date).getTime() : 0;
      const bTime = b.week_date ? new Date(b.week_date).getTime() : 0;
      return aTime - bTime;
    });
  }, [allWeeks]);

  useEffect(() => {
    if (!selectedWeekId && orderedWeeks.length > 0) {
      setSelectedWeekId(orderedWeeks[0].id);
    }
  }, [orderedWeeks, selectedWeekId]);

  useEffect(() => {
    setSelectedWeekId(null);
  }, [activeProgramId]);

  const matrixWeeks = useMemo(() => {
    if (!selectedWeekId) {
      return [];
    }
    const index = orderedMatrixWeeks.findIndex((week) => week.id === selectedWeekId);
    if (index === -1) {
      return [];
    }
    const startIndex = Math.max(0, index - 4);
    return orderedMatrixWeeks.slice(startIndex, index + 1);
  }, [orderedMatrixWeeks, selectedWeekId]);

  const matrixQueries = useQueries({
    queries: matrixWeeks.map((week) => ({
      queryKey: ["assignments", week.id],
      queryFn: () => fetchAssignmentsByWeek(week.id),
      enabled: Boolean(week.id),
    })),
  });

  const assignmentsByWeek = useMemo(() => {
    const result: Record<string, Awaited<ReturnType<typeof fetchAssignmentsByWeek>>> = {};
    matrixWeeks.forEach((week, index) => {
      result[week.id] = matrixQueries[index]?.data ?? [];
    });
    return result;
  }, [matrixQueries, matrixWeeks]);

  const selectedWeek = orderedWeeks.find((week) => week.id === selectedWeekId) ?? null;

  const validateAssignmentChange = (
    assignmentId: string,
    personId: string | null,
    weekId: string,
    role: "assignee" | "assistant",
    assignmentsForWeek: typeof assignments
  ) => {
    if (!personId) {
      return true;
    }
    const assignment = assignmentsForWeek.find((item) => item.id === assignmentId);
    if (!assignment) {
      return false;
    }
    const person = persons.find((item) => item.id === personId);
    if (!person) {
      return false;
    }
    const weekInfo = orderedWeeks.find((week) => week.id === weekId);
    const weekDate = weekInfo?.week_date ?? null;
    const extra = (weekInfo?.extra_data ?? {}) as Record<string, unknown>;
    if (extra.asamblea_conmemoracion) {
      enqueueSnackbar("Semana bloqueada por asamblea o conmemoracion.", {
        variant: "error",
      });
      return false;
    }
    if (extra.viajante && assignment.assignment_type.category === "estudio_biblico") {
      enqueueSnackbar("Semana con viajante: no se asigna estudio biblico.", {
        variant: "error",
      });
      return false;
    }
    const blockReason = getAssignmentBlockReason(
      personId,
      assignment,
      assignmentsForWeek,
      role
    );
    if (blockReason) {
      enqueueSnackbar(blockReason, { variant: "error" });
      return false;
    }
    if (
      !canAssignPersonToAssignmentInWeek(
        person,
        assignment,
        assignmentsForWeek,
        weekDate,
        role
      )
    ) {
      if (isPersonAbsentOnWeek(person, weekDate)) {
        enqueueSnackbar("La persona esta ausente en esta semana.", { variant: "error" });
      } else {
        enqueueSnackbar("La persona no esta habilitada para esta asignacion.", {
          variant: "error",
        });
      }
      return false;
    }
    if (!isExcludedFromLoadCount(assignment)) {
      const count = countAssignmentsForPerson(assignmentsForWeek, personId, assignment.id);
      const nextCount = count + 1;
      if (nextCount >= 2) {
        enqueueSnackbar(
          `Advertencia: la persona quedara con ${nextCount} asignaciones en la semana.`,
          { variant: "warning" }
        );
      }
    }
    return true;
  };

  return (
    <Stack gap={3}>
      <Typography variant="h4">Asignaciones</Typography>
      {!activeProgramId ? (
        <Alert severity="warning">
          Selecciona un programa actual para visualizar las asignaciones.
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems="center">
        <FormControl sx={{ minWidth: 240 }} disabled={isWeeksLoading || !activeProgramId}>
          <InputLabel id="week-select-label">Semana</InputLabel>
          <Select
            labelId="week-select-label"
            value={selectedWeekId ?? ""}
            label="Semana"
            onChange={(event) => setSelectedWeekId(String(event.target.value))}
          >
            {orderedWeeks.map((week) => (
              <MenuItem key={week.id} value={week.id}>
                Semana {week.week_number} · {week.date_range}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedWeek?.reading ? (
          <Typography color="text.secondary">Lectura: {selectedWeek.reading}</Typography>
        ) : null}
      </Stack>
      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        {views.map((view) => (
          <Tab key={view.label} label={view.label} />
        ))}
      </Tabs>
      <Box>
        {tab === 0 ? (
          <GridView
            assignments={assignments}
            persons={persons}
            isUpdating={
              reassign.isPending || updateAssistant.isPending || isAssignmentsLoading
            }
            week={selectedWeek}
            onReassign={(assignmentId, personId) => {
              if (!selectedWeekId) {
                return;
              }
              if (!personId) {
                reassign.mutate({ assignmentId, personId, weekId: selectedWeekId });
                return;
              }
              if (
                validateAssignmentChange(
                  assignmentId,
                  personId,
                  selectedWeekId,
                  "assignee",
                  assignments
                )
              ) {
                reassign.mutate({ assignmentId, personId, weekId: selectedWeekId });
              }
            }}
            onAssistantChange={(assignmentId, assistantId) => {
              if (!selectedWeekId) {
                return;
              }
              if (!assistantId) {
                updateAssistant.mutate({
                  assignmentId,
                  assistantId,
                  weekId: selectedWeekId,
                });
                return;
              }
              if (
                validateAssignmentChange(
                  assignmentId,
                  assistantId,
                  selectedWeekId,
                  "assistant",
                  assignments
                )
              ) {
                updateAssistant.mutate({
                  assignmentId,
                  assistantId,
                  weekId: selectedWeekId,
                });
              }
            }}
          />
        ) : null}
        {tab === 1 ? (
          <MatrixView
            weeks={matrixWeeks}
            assignmentsByWeek={assignmentsByWeek}
            persons={persons}
            activeProgramId={activeProgramId}
            isUpdating={
              reassign.isPending ||
              updateAssistant.isPending ||
              unassign.isPending ||
              isAssignmentsLoading
            }
            onReassign={(assignmentId, personId, weekId) => {
              if (!selectedWeekId) {
                return;
              }
              if (!personId) {
                reassign.mutate({ assignmentId, personId, weekId });
                return;
              }
              const assignmentsForWeek = assignmentsByWeek[weekId] ?? [];
              if (
                validateAssignmentChange(
                  assignmentId,
                  personId,
                  weekId,
                  "assignee",
                  assignmentsForWeek
                )
              ) {
                reassign.mutate({ assignmentId, personId, weekId });
              }
            }}
            onAssistantChange={(assignmentId, assistantId, weekId) => {
              const assignmentsForWeek = assignmentsByWeek[weekId] ?? [];
              if (!assistantId) {
                updateAssistant.mutate({ assignmentId, assistantId, weekId });
                return;
              }
              if (
                validateAssignmentChange(
                  assignmentId,
                  assistantId,
                  weekId,
                  "assistant",
                  assignmentsForWeek
                )
              ) {
                updateAssistant.mutate({ assignmentId, assistantId, weekId });
              }
            }}
            onUnassign={(assignmentId, weekId) => {
              unassign.mutate({ assignmentId, weekId });
            }}
          />
        ) : null}
        {tab === 2 ? (
          <ProgramView
            week={selectedWeek}
            assignments={assignments}
            persons={persons}
            isUpdating={
              reassign.isPending || updateAssistant.isPending || isAssignmentsLoading
            }
            onReassign={(assignmentId, personId) => {
              if (!selectedWeekId) {
                return;
              }
              if (!personId) {
                reassign.mutate({ assignmentId, personId, weekId: selectedWeekId });
                return;
              }
              if (
                validateAssignmentChange(
                  assignmentId,
                  personId,
                  selectedWeekId,
                  "assignee",
                  assignments
                )
              ) {
                reassign.mutate({ assignmentId, personId, weekId: selectedWeekId });
              }
            }}
            onAssistantChange={(assignmentId, assistantId) => {
              if (!selectedWeekId) {
                return;
              }
              if (!assistantId) {
                updateAssistant.mutate({
                  assignmentId,
                  assistantId,
                  weekId: selectedWeekId,
                });
                return;
              }
              if (
                validateAssignmentChange(
                  assignmentId,
                  assistantId,
                  selectedWeekId,
                  "assistant",
                  assignments
                )
              ) {
                updateAssistant.mutate({
                  assignmentId,
                  assistantId,
                  weekId: selectedWeekId,
                });
              }
            }}
          />
        ) : null}
      </Box>
    </Stack>
  );
};
