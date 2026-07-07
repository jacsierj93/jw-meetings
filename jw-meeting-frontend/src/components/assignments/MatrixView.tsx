import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import type { Assignment } from "../../types/assignment";
import type { Person } from "../../types/person";
import type { Week } from "../../types/program";
import {
  canAssignPersonToAssignmentInWeek,
  getAbsenceRange,
  isPersonAbsentOnWeek,
} from "../../utils/assignmentRules";

interface MatrixViewProps {
  weeks: Week[];
  assignmentsByWeek: Record<string, Assignment[]>;
  persons: Person[];
  activeProgramId?: string | null;
  onReassign: (assignmentId: string, personId: string | null, weekId: string) => void;
  onAssistantChange: (
    assignmentId: string,
    assistantId: string | null,
    weekId: string
  ) => void;
  onUnassign: (assignmentId: string, weekId: string) => void;
  isUpdating?: boolean;
}

interface AssignmentDraft {
  tabId: string;
  assignmentId: string | null;
  assistantId: string | null;
}

export const MatrixView = ({
  weeks,
  assignmentsByWeek,
  persons,
  activeProgramId,
  onReassign,
  onAssistantChange,
  onUnassign,
  isUpdating,
}: MatrixViewProps) => {
  const [open, setOpen] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AssignmentDraft[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const orderedWeeks = useMemo(
    () =>
      [...weeks].sort((a, b) => {
        const aTime = a.week_date ? new Date(a.week_date).getTime() : 0;
        const bTime = b.week_date ? new Date(b.week_date).getTime() : 0;
        return aTime - bTime;
      }),
    [weeks]
  );

  const getTypeColors = (code: string) => {
    const palette: Record<string, { bg: string; border: string; text?: string }> = {
      lectura_biblica: { bg: "rgba(139, 0, 0, 0.18)", border: "1px solid rgba(139, 0, 0, 0.5)" },
      empiece_conversaciones: {
        bg: "rgba(30, 136, 229, 0.18)",
        border: "1px solid rgba(30, 136, 229, 0.5)",
      },
      haga_revisitas: {
        bg: "rgba(46, 125, 50, 0.18)",
        border: "1px solid rgba(46, 125, 50, 0.5)",
      },
      haga_discipulos: {
        bg: "rgba(123, 31, 162, 0.18)",
        border: "1px solid rgba(123, 31, 162, 0.5)",
      },
      explique_creencias: {
        bg: "rgba(255, 143, 0, 0.2)",
        border: "1px solid rgba(255, 143, 0, 0.5)",
      },
      discurso_ministerio: {
        bg: "rgba(0, 121, 107, 0.18)",
        border: "1px solid rgba(0, 121, 107, 0.5)",
      },
      default: { bg: "rgba(100, 100, 100, 0.15)", border: "1px solid rgba(100, 100, 100, 0.3)" },
    };

    if (palette[code]) {
      return palette[code];
    }

    let hash = 0;
    for (let i = 0; i < code.length; i += 1) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const bg = `hsla(${hue}, 65%, 75%, 0.35)`;
    const border = `1px solid hsla(${hue}, 65%, 45%, 0.7)`;
    return { bg, border };
  };

  const isPreviousProgramWeek = (week: Week) =>
    Boolean(activeProgramId && week.program_id !== activeProgramId);

  const assignmentsForWeek = useMemo(() => {
    if (!selectedWeekId) {
      return [];
    }
    const assignments = assignmentsByWeek[selectedWeekId] ?? [];
    return assignments;
  }, [assignmentsByWeek, selectedWeekId]);

  const selectedDraft = drafts.find((draft) => draft.tabId === selectedTabId) ?? drafts[0] ?? null;
  const hasDraftAssignments = drafts.some((draft) => draft.assignmentId);
  const selectedAssignment = assignmentsForWeek.find(
    (assignment) => assignment.id === selectedDraft?.assignmentId
  );
  const selectedWeek = orderedWeeks.find((week) => week.id === selectedWeekId);
  const selectedPerson = persons.find((person) => person.id === selectedPersonId);
  const selectedWeekExtra = (selectedWeek?.extra_data ?? {}) as Record<string, unknown>;
  const isAssemblyWeek = Boolean(selectedWeekExtra.asamblea_conmemoracion);
  const isViajanteWeek = Boolean(selectedWeekExtra.viajante);
  const assignedForPerson = useMemo(() => {
    if (!selectedPerson) {
      return [];
    }
    return assignmentsForWeek.filter(
      (assignment) =>
        assignment.assignee?.id === selectedPerson.id ||
        assignment.assistant?.id === selectedPerson.id
    );
  }, [assignmentsForWeek, selectedPerson]);
  const selectableAssignments = useMemo(() => {
    if (!selectedPerson) {
      return [];
    }
    if (isAssemblyWeek) {
      return [];
    }
    return assignmentsForWeek.filter((assignment) => {
      if (isViajanteWeek && assignment.assignment_type.category === "estudio_biblico") {
        return false;
      }
      if (selectedDraft?.assignmentId && assignment.id === selectedDraft.assignmentId) {
        return true;
      }
      const isCurrent = assignment.assignee?.id === selectedPerson.id;
      if (isCurrent) {
        return true;
      }
      return canAssignPersonToAssignmentInWeek(
        selectedPerson,
        assignment,
        assignmentsForWeek,
        selectedWeek?.week_date ?? null,
        "assignee"
      );
    });
  }, [
    assignmentsForWeek,
    isAssemblyWeek,
    isViajanteWeek,
    selectedDraft?.assignmentId,
    selectedPerson,
    selectedWeek?.week_date,
  ]);
  const usedAssignmentIds = useMemo(
    () => drafts.map((draft) => draft.assignmentId).filter(Boolean) as string[],
    [drafts]
  );
  const availableToAdd = useMemo(
    () =>
      selectableAssignments.filter(
        (assignment) => !usedAssignmentIds.includes(assignment.id)
      ),
    [selectableAssignments, usedAssignmentIds]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (drafts.length === 0) {
      const initial = assignedForPerson.map((assignment) => ({
        tabId: assignment.id,
        assignmentId: assignment.id,
        assistantId: assignment.assistant?.id ?? null,
      }));
      if (initial.length > 0) {
        setDrafts(initial);
        setSelectedTabId(initial[0].tabId);
      } else {
        const newTabId = `new-${Date.now()}`;
        setDrafts([{ tabId: newTabId, assignmentId: null, assistantId: null }]);
        setSelectedTabId(newTabId);
      }
    }
  }, [assignedForPerson, drafts.length, open]);

  const handleOpen = (
    weekId: string,
    personId: string,
    assignmentId?: string | null
  ) => {
    setSelectedWeekId(weekId);
    setSelectedPersonId(personId);
    const assignments = assignmentsByWeek[weekId] ?? [];
    const existing = assignments.filter(
      (assignment) =>
        assignment.assignee?.id === personId || assignment.assistant?.id === personId
    );
    const initialDrafts =
      existing.length > 0
        ? existing.map((assignment) => ({
            tabId: assignment.id,
            assignmentId: assignment.id,
            assistantId: assignment.assistant?.id ?? null,
          }))
        : [
            {
              tabId: assignmentId ?? `new-${Date.now()}`,
              assignmentId: assignmentId ?? null,
              assistantId:
                assignments.find((item) => item.id === assignmentId)?.assistant?.id ?? null,
            },
          ];
    setDrafts(initialDrafts);
    setSelectedTabId(assignmentId ?? initialDrafts[0]?.tabId ?? null);
    setOpen(true);
  };

  const handleSave = () => {
    if (!selectedWeekId || !selectedPersonId || drafts.length === 0) {
      return;
    }
    drafts.forEach((draft) => {
      if (!draft.assignmentId) {
        return;
      }
      onReassign(draft.assignmentId, selectedPersonId, selectedWeekId);
      const assignment = assignmentsForWeek.find((item) => item.id === draft.assignmentId);
      if (assignment?.assignment_type.requires_assistant) {
        onAssistantChange(draft.assignmentId, draft.assistantId ?? null, selectedWeekId);
      }
    });
    setOpen(false);
  };

  const handleAddDraft = () => {
    if (availableToAdd.length === 0) {
      return;
    }
    const newTabId = `new-${Date.now()}`;
    setDrafts((prev) => [
      ...prev,
      { tabId: newTabId, assignmentId: null, assistantId: null },
    ]);
    setSelectedTabId(newTabId);
  };

  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6">Vista Matriz</Typography>
        <TableContainer
          sx={{
            borderRadius: 3,
            border: "1px solid rgba(30, 95, 116, 0.12)",
            maxHeight: 520,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 220 }}>Persona</TableCell>
                {orderedWeeks.map((week) => (
                  <TableCell
                    key={week.id}
                    align="center"
                    sx={{
                      minWidth: 160,
                      backgroundColor: isPreviousProgramWeek(week)
                        ? "rgba(90, 110, 130, 0.08)"
                        : undefined,
                      borderLeft: isPreviousProgramWeek(week)
                        ? "2px solid rgba(90, 110, 130, 0.35)"
                        : undefined,
                    }}
                  >
                    Semana {week.week_number}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {week.date_range}
                    </Typography>
                    {isPreviousProgramWeek(week) ? (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Programa anterior
                      </Typography>
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {persons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={orderedWeeks.length + 1}>
                    <Typography color="text.secondary">
                      No hay personas cargadas para mostrar la matriz.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                persons.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {person.full_name}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {(() => {
                          const count = orderedWeeks.reduce((total, week) => {
                            const assignments = assignmentsByWeek[week.id] ?? [];
                            const assigned = assignments.filter(
                              (assignment) => assignment.assignee?.id === person.id
                            ).length;
                            const assisting = assignments.filter(
                              (assignment) => assignment.assistant?.id === person.id
                            ).length;
                            return total + assigned + assisting;
                          }, 0);
                          return `${count} asignaciones (ultimas ${orderedWeeks.length})`;
                        })()}
                      </Typography>
                    </TableCell>
                    {orderedWeeks.map((week) => {
                      const assignments = assignmentsByWeek[week.id] ?? [];
                      const assigned = assignments.filter(
                        (assignment) => assignment.assignee?.id === person.id
                      );
                      const assisting = assignments.filter(
                        (assignment) => assignment.assistant?.id === person.id
                      );
                      const weekExtra = (week.extra_data ?? {}) as Record<string, unknown>;
                      const isAssembly = Boolean(weekExtra.asamblea_conmemoracion);
                      const isAbsent = isPersonAbsentOnWeek(person, week.week_date);
                      const isPreviousProgram = isPreviousProgramWeek(week);

                      return (
                        <TableCell
                          key={`${person.id}-${week.id}`}
                          align="center"
                          onClick={() => {
                            if (isUpdating) {
                              return;
                            }
                            if (isAssembly) {
                              enqueueSnackbar(
                                "Semana bloqueada por asamblea o conmemoracion.",
                                { variant: "warning" }
                              );
                              return;
                            }
                            if (isAbsent) {
                              const absence = getAbsenceRange(person);
                              enqueueSnackbar(
                                absence
                                  ? `Persona ausente (${absence.start} a ${absence.end}).`
                                  : "Persona ausente.",
                                { variant: "warning" }
                              );
                              return;
                            }
                            const assignmentId =
                              assigned[0]?.id ?? assisting[0]?.id ?? null;
                            handleOpen(week.id, person.id, assignmentId);
                          }}
                          sx={{
                            cursor: isUpdating || isAbsent || isAssembly ? "not-allowed" : "pointer",
                            backgroundColor: isAbsent
                              ? "rgba(120, 120, 120, 0.18)"
                              : isAssembly
                                ? "rgba(120, 120, 120, 0.1)"
                                : assigned.length
                                  ? "rgba(243, 180, 49, 0.12)"
                                  : isPreviousProgram
                                    ? "rgba(90, 110, 130, 0.06)"
                                    : "transparent",
                            borderLeft: isPreviousProgram
                              ? "2px solid rgba(90, 110, 130, 0.25)"
                              : undefined,
                            "&:hover": {
                              backgroundColor: isUpdating || isAbsent
                                ? undefined
                                : isAssembly
                                  ? "rgba(120, 120, 120, 0.18)"
                                : assigned.length
                                  ? "rgba(243, 180, 49, 0.22)"
                                  : isPreviousProgram
                                    ? "rgba(90, 110, 130, 0.14)"
                                    : "rgba(30, 95, 116, 0.12)",
                            },
                          }}
                        >
                          <Stack gap={0.5} alignItems="center">
                            {isAssembly ? (
                              <Typography variant="caption" color="text.secondary">
                                Asamblea
                              </Typography>
                            ) : isAbsent ? (
                              <Typography variant="caption" color="text.secondary">
                                Ausente
                              </Typography>
                            ) : assigned.length === 0 && assisting.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                Sin asignar
                              </Typography>
                            ) : (
                              <>
                                {assigned.map((assignment) => {
                                  const colors = getTypeColors(assignment.assignment_type.code);
                                  return (
                                    <Chip
                                      key={assignment.id}
                                      size="small"
                                      label={assignment.title}
                                      sx={{
                                        maxWidth: 140,
                                        backgroundColor: colors.bg,
                                        border: colors.border,
                                        opacity: isAbsent ? 0.5 : 1,
                                      }}
                                    />
                                  );
                                })}
                                {assisting.map((assignment) => (
                                  <Chip
                                    key={`${assignment.id}-assistant`}
                                    size="small"
                                    label={`Ayudante: ${assignment.title}`}
                                    sx={{
                                      maxWidth: 160,
                                      backgroundColor: getTypeColors(assignment.assignment_type.code).bg,
                                      border: getTypeColors(assignment.assignment_type.code).border,
                                      opacity: isAbsent ? 0.4 : 0.8,
                                    }}
                                  />
                                ))}
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Asignar intervencion</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <Stack gap={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Semana
              </Typography>
              <Typography>
                {selectedWeek
                  ? `Semana ${selectedWeek.week_number} - ${selectedWeek.date_range}`
                  : "Sin semana seleccionada"}
              </Typography>
              {selectedWeek?.reading ? (
                <Typography variant="body2" color="text.secondary">
                  Lectura: {selectedWeek.reading}
                </Typography>
              ) : null}
            </Stack>
            <Stack gap={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Persona
              </Typography>
              <Typography>{selectedPerson?.full_name ?? "Sin persona"}</Typography>
            </Stack>
            {assignmentsForWeek.length === 0 ? (
              <Typography color="text.secondary">
                No hay asignaciones en esta semana.
              </Typography>
            ) : (
              <>
                {drafts.length >= 1 ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Tabs
                      value={selectedTabId ?? drafts[0]?.tabId ?? ""}
                    onChange={(_event, value) => {
                      const nextId = String(value);
                      setSelectedTabId(nextId);
                    }}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        borderBottom: "1px solid rgba(30, 95, 116, 0.12)",
                        flexGrow: 1,
                      }}
                    >
                    {drafts.map((draft) => {
                      const assignment = assignmentsForWeek.find(
                        (item) => item.id === draft.assignmentId
                      );
                      const assigneeName = assignment?.assignee?.full_name;
                      const prefix = assigneeName ? "✓ " : "";
                      const suffix = assigneeName ? ` (Encargado: ${assigneeName})` : "";
                      const label = assignment
                        ? `${prefix}${assignment.assignment_type.name} - ${assignment.title}${suffix}`
                        : "Nueva asignacion";
                      return (
                        <Tab
                          key={draft.tabId}
                          value={draft.tabId}
                          label={label}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.85rem",
                            alignItems: "flex-start",
                            ...(assigneeName
                              ? {
                                  backgroundColor: "rgba(33, 150, 243, 0.12)",
                                  "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.2)" },
                                }
                              : {}),
                          }}
                        />
                      );
                    })}
                    </Tabs>
                    {availableToAdd.length > 0 ? (
                      <IconButton aria-label="Agregar asignacion" size="small" onClick={handleAddDraft}>
                        <AddRoundedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                ) : null}
                {drafts.length === 0 ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography color="text.secondary">
                      Sin asignaciones asignadas.
                    </Typography>
                    {availableToAdd.length > 0 ? (
                      <IconButton
                        aria-label="Agregar asignacion"
                        size="small"
                        onClick={handleAddDraft}
                      >
                        <AddRoundedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                ) : null}

                {isAssemblyWeek ? (
                  <Typography color="error" variant="body2">
                    Semana bloqueada por asamblea o conmemoracion. No se permiten asignaciones.
                  </Typography>
                ) : null}

                {selectableAssignments.length > 0 && selectedDraft ? (
                  <FormControl fullWidth>
                    <InputLabel id="assignment-type-select">Asignacion</InputLabel>
                    <Select
                      labelId="assignment-type-select"
                      value={selectedDraft.assignmentId ?? ""}
                      label="Asignacion"
                      onChange={(event) => {
                        const nextId = String(event.target.value);
                        setDrafts((prev) =>
                          prev.map((draft) => {
                            if (draft.tabId !== selectedDraft.tabId) {
                              return draft;
                            }
                            const assignment = assignmentsForWeek.find((item) => item.id === nextId);
                            return {
                              ...draft,
                              assignmentId: nextId || null,
                              assistantId: assignment?.assistant?.id ?? null,
                            };
                          })
                        );
                      }}
                    >
                      {selectableAssignments
                        .filter(
                          (assignment) =>
                            assignment.id === selectedDraft.assignmentId ||
                            !usedAssignmentIds.includes(assignment.id)
                        )
                        .map((assignment) => {
                          const assigneeName = assignment.assignee?.full_name;
                          const prefix = assigneeName ? "? " : "";
                          const suffix = assigneeName ? ` (Encargado: ${assigneeName})` : "";
                          return (
                            <MenuItem
                              key={assignment.id}
                              value={assignment.id}
                              sx={
                                assigneeName
                                  ? {
                                      backgroundColor: "rgba(33, 150, 243, 0.12)",
                                      "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.2)" },
                                    }
                                  : undefined
                              }
                            >
                              {prefix}
                              {assignment.assignment_type.name} - {assignment.title}
                              {suffix}
                            </MenuItem>
                          );
                        })}
                    </Select>
                  </FormControl>
                ) : null}

                {selectedAssignment ? (
                  <Stack gap={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Informacion de la asignacion
                    </Typography>
                    <Typography>
                      {selectedAssignment.assignment_type.name} - {selectedAssignment.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Duracion:{" "}
                      {selectedAssignment.duration ??
                        selectedAssignment.assignment_type.default_duration ??
                        "-"}{" "}
                      min
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Encargado actual:{" "}
                      {selectedAssignment.assignee?.full_name ?? "Sin asignar"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ayudante actual:{" "}
                      {selectedAssignment.assignment_type.requires_assistant
                        ? selectedAssignment.assistant?.full_name ?? "Sin asignar"
                        : "No requiere"}
                    </Typography>
                    {selectedPerson ? (
                      (() => {
                        const absence = getAbsenceRange(selectedPerson);
                        if (!absence || !selectedWeek?.week_date) {
                          return null;
                        }
                        const isAbsent =
                          new Date(selectedWeek.week_date).getTime() >=
                            new Date(absence.start).getTime() &&
                          new Date(selectedWeek.week_date).getTime() <=
                            new Date(absence.end).getTime();
                        return isAbsent ? (
                          <Typography variant="body2" color="error">
                            Persona ausente ({absence.start} a {absence.end})
                          </Typography>
                        ) : null;
                      })()
                    ) : null}
                    <Stack gap={0.5}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Detalles de ministerio
                      </Typography>
                      {selectedAssignment?.assignment_type.category !== "ministerio" ? (
                        <Typography variant="body2" color="text.secondary">
                          Sin detalles para esta asignacion.
                        </Typography>
                      ) : (
                        (() => {
                          const items = selectedWeek?.content?.ministry_items ?? [];
                          const assignments = assignmentsForWeek
                            .filter((item) => item.assignment_type.category === "ministerio")
                            .sort((a, b) => a.order_index - b.order_index);
                          const index = assignments.findIndex(
                            (item) => item.id === selectedAssignment?.id
                          );
                          const item = items[index];
                          return item?.detail?.raw_text ? (
                            <Typography variant="body2" color="text.secondary">
                              {item.detail.raw_text}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin detalles disponibles.
                            </Typography>
                          );
                        })()
                      )}
                    </Stack>
                  </Stack>
                ) : null}
                {selectedAssignment ? (
                  <FormControl
                    fullWidth
                    disabled={!selectedAssignment.assignment_type.requires_assistant}
                  >
                    <InputLabel id="assistant-select">Ayudante</InputLabel>
                    <Select
                      labelId="assistant-select"
                      value={selectedDraft?.assistantId ?? ""}
                      label="Ayudante"
                      onChange={(event) => {
                        const nextValue = String(event.target.value);
                        if (!selectedDraft) {
                          return;
                        }
                        setDrafts((prev) =>
                          prev.map((draft) =>
                            draft.tabId === selectedDraft.tabId
                              ? { ...draft, assistantId: nextValue ? nextValue : null }
                              : draft
                          )
                        );
                      }}
                    >
                      <MenuItem value="">
                        <em>Sin asignar</em>
                      </MenuItem>
                      {persons.map((person) => {
                        const isAbsent = isPersonAbsentOnWeek(person, selectedWeek?.week_date);
                        const isAllowed = selectedAssignment
                          ? canAssignPersonToAssignmentInWeek(
                              person,
                              selectedAssignment,
                              assignmentsForWeek,
                              selectedWeek?.week_date ?? null,
                              "assistant"
                            )
                          : true;
                        const isCurrent = person.id === selectedAssignment?.assistant?.id;
                        if (!isAllowed && !isCurrent) {
                          return null;
                        }
                        return (
                          <MenuItem key={person.id} value={person.id} disabled={isAbsent}>
                            {person.full_name}
                            {isAbsent ? " (Ausente)" : ""}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                ) : null}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            onClick={() => {
              if (!selectedDraft?.assignmentId || !selectedWeekId) {
                return;
              }
              const confirmed = window.confirm(
                "Al eliminar esta asignacion se quitará también el ayudante. ¿Deseas continuar?"
              );
              if (!confirmed) {
                return;
              }
              onUnassign(selectedDraft.assignmentId, selectedWeekId);
              setOpen(false);
            }}
            disabled={!selectedDraft?.assignmentId || isAssemblyWeek || Boolean(isUpdating)}
          >
            Quitar asignacion
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasDraftAssignments || isAssemblyWeek || Boolean(isUpdating)}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
