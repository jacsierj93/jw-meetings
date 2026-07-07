/* eslint-disable react-hooks/set-state-in-effect */
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { fetchAssignmentsByWeek } from "../api/assignments";
import {
  PrintableAssignmentCards,
  type AssignmentCardData,
} from "../components/print/PrintableAssignmentCards";
import { useAppStore } from "../hooks/useAppStore";
import { usePersons } from "../hooks/usePersons";
import { useWeeks } from "../hooks/useWeeks";
import type { Assignment } from "../types/assignment";
import type { Person } from "../types/person";
import type { Week } from "../types/program";
import { getPersonFirstName, getPersonPhone } from "../utils/assignmentRules";

type Mode = "range" | "assignment" | "person";

const isStudentAssignment = (assignment: Assignment) =>
  assignment.assignment_type.code === "lectura_biblica" ||
  assignment.assignment_type.category === "ministerio";

const buildCardsForWeek = (week: Week, assignments: Assignment[]) => {
  const studentAssignments = assignments.filter(isStudentAssignment);
  const ministerio = studentAssignments
    .filter((assignment) => assignment.assignment_type.category === "ministerio")
    .sort((a, b) => a.order_index - b.order_index);
  const lectura = studentAssignments.find(
    (assignment) => assignment.assignment_type.code === "lectura_biblica"
  );

  const cards: AssignmentCardData[] = [];
  if (lectura?.assignee) {
    cards.push({
      id: lectura.id,
      name: lectura.assignee.full_name,
      assistant: "",
      date: week.date_range,
      weekDate: String(week.week_date),
      interventionNumber: "3",
      description: "Lectura de la Biblia",
      assigneeId: lectura.assignee.id,
    });
  }

  ministerio.forEach((assignment, index) => {
    if (!assignment.assignee) {
      return;
    }
    cards.push({
      id: assignment.id,
      name: assignment.assignee.full_name,
      assistant: assignment.assistant?.full_name ?? "",
      date: week.date_range,
      weekDate: String(week.week_date),
      interventionNumber: String(4 + index),
      description: assignment.title,
      assigneeId: assignment.assignee.id,
    });
  });

  return cards;
};

const formatDateForGoogle = (dateValue: Date) => {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const addDays = (dateValue: Date, days: number) => {
  const next = new Date(dateValue);
  next.setDate(next.getDate() + days);
  return next;
};

const buildCalendarLink = (card: AssignmentCardData) => {
  if (!card.weekDate) {
    return "";
  }

  const startDate = new Date(card.weekDate);
  if (Number.isNaN(startDate.getTime())) {
    return "";
  }

  const endDate = addDays(startDate, 1);
  const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
  const title = `${card.interventionNumber}. ${card.description}`;
  const details = `Asignación para la reunión (${card.date})${card.assistant ? `\nAyudante: ${card.assistant}` : ""}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const buildMessageLine = (card: AssignmentCardData) => {
  const base = `- ${card.date}: ${card.interventionNumber}. ${card.description}${
    card.assistant ? ` (Ayudante: ${card.assistant})` : ""
  }`;
  const calendarLink = buildCalendarLink(card);
  if (!calendarLink) {
    return base;
  }
  return `${base}\n  Calendario: ${calendarLink}`;
};

const buildDefaultWhatsAppMessage = (personName: string, selectedCards: AssignmentCardData[]) => {
  const intro = personName
    ? `Hola ${personName}, te comparto tus asignaciones.`
    : "Hola, te comparto tus asignaciones.";

  const details = selectedCards.map((card) => buildMessageLine(card)).join("\n");

  return `${intro}\n\n${details}`;
};

const normalizeWhatsAppPhone = (phone: string) => {
  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("+")) {
    return normalized.slice(1);
  }
  return normalized;
};

export const PrintCardsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const activeProgramId = useAppStore((state) => state.activeProgramId);
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const { data: weeks = [] } = useWeeks(activeProgramId);
  const { data: persons = [] } = usePersons(activeCongregationId);

  const orderedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.week_number - b.week_number),
    [weeks]
  );

  const assignmentsQueries = useQueries({
    queries: orderedWeeks.map((week) => ({
      queryKey: ["assignments", week.id],
      queryFn: () => fetchAssignmentsByWeek(week.id),
      enabled: Boolean(week.id),
    })),
  });

  const assignmentsByWeek = useMemo(() => {
    const result: Record<string, Assignment[]> = {};
    orderedWeeks.forEach((week, index) => {
      result[week.id] = assignmentsQueries[index]?.data ?? [];
    });
    return result;
  }, [assignmentsQueries, orderedWeeks]);

  const [mode, setMode] = useState<Mode>("range");
  const [startWeekId, setStartWeekId] = useState<string | null>(null);
  const [endWeekId, setEndWeekId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");

  const previousPersonIdRef = useRef<string | null>(null);
  const previousModeRef = useRef<Mode>("range");

  useEffect(() => {
    if (!startWeekId && orderedWeeks.length > 0) {
      setStartWeekId(orderedWeeks[0].id);
      setEndWeekId(orderedWeeks[0].id);
    }
  }, [orderedWeeks, startWeekId]);

  useEffect(() => {
    setStartWeekId(null);
    setEndWeekId(null);
    setSelectedAssignmentId(null);
    setSelectedPersonId(null);
    setSelectedCardIds([]);
    setWhatsAppMessage("");
    previousPersonIdRef.current = null;
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

  const assignmentOptions = useMemo(() => {
    return orderedWeeks.flatMap((week) => {
      const assignments = assignmentsByWeek[week.id] ?? [];
      return assignments
        .filter(isStudentAssignment)
        .map((assignment) => ({
          id: assignment.id,
          week,
          assignment,
        }));
    });
  }, [assignmentsByWeek, orderedWeeks]);

  const personIdsWithAssignmentsInProgram = useMemo(() => {
    const ids = new Set<string>();
    orderedWeeks.forEach((week) => {
      const weekCards = buildCardsForWeek(week, assignmentsByWeek[week.id] ?? []);
      weekCards.forEach((card) => {
        if (card.assigneeId) {
          ids.add(card.assigneeId);
        }
      });
    });
    return ids;
  }, [assignmentsByWeek, orderedWeeks]);

  const selectedAssignment = assignmentOptions.find(
    (option) => option.id === selectedAssignmentId
  );

  const cards = useMemo(() => {
    if (mode === "range") {
      return rangeWeeks
        .flatMap((week) => buildCardsForWeek(week, assignmentsByWeek[week.id] ?? []))
        .filter((card) => card.name);
    }
    if (mode === "assignment" && selectedAssignment) {
      const assignment = selectedAssignment.assignment;
      if (!assignment.assignee) {
        return [];
      }
      const ministryAssignments = (assignmentsByWeek[selectedAssignment.week.id] ?? [])
        .filter((item) => item.assignment_type.category === "ministerio")
        .sort((a, b) => a.order_index - b.order_index);
      const ministryIndex = ministryAssignments.findIndex((item) => item.id === assignment.id);
      const interventionNumber =
        assignment.assignment_type.code === "lectura_biblica"
          ? "3"
          : String(ministryIndex >= 0 ? 4 + ministryIndex : 4);

      return [
        {
          id: assignment.id,
          name: assignment.assignee.full_name,
          assistant: assignment.assistant?.full_name ?? "",
          date: selectedAssignment.week.date_range,
          weekDate: String(selectedAssignment.week.week_date),
          interventionNumber,
          description:
            assignment.assignment_type.code === "lectura_biblica"
              ? "Lectura de la Biblia"
              : assignment.title,
          assigneeId: assignment.assignee.id,
        },
      ];
    }
    if (mode === "person" && selectedPersonId) {
      return orderedWeeks.flatMap((week) => {
        const assignments = assignmentsByWeek[week.id] ?? [];
        return buildCardsForWeek(week, assignments).filter(
          (card) => card.assigneeId === selectedPersonId
        );
      });
    }
    return [];
  }, [
    assignmentsByWeek,
    mode,
    orderedWeeks,
    rangeWeeks,
    selectedAssignment,
    selectedPersonId,
  ]);

  useEffect(() => {
    const switchedToPerson = previousModeRef.current !== "person" && mode === "person";
    const personChanged = previousPersonIdRef.current !== selectedPersonId;

    if (mode === "person" && (switchedToPerson || personChanged)) {
      setSelectedCardIds(cards.map((card) => card.id));
    }

    if (mode !== "person" && previousModeRef.current === "person") {
      setSelectedCardIds([]);
    }

    previousModeRef.current = mode;
  }, [cards, mode, selectedPersonId]);

  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);

  const selectedCards = useMemo(
    () => cards.filter((card) => selectedCardIdSet.has(card.id)),
    [cards, selectedCardIdSet]
  );

  const selectedPerson = useMemo<Person | null>(() => {
    if (!selectedPersonId) {
      return null;
    }
    return persons.find((person) => person.id === selectedPersonId) ?? null;
  }, [persons, selectedPersonId]);

  const selectedPersonName = useMemo(() => {
    if (!selectedPerson) {
      return "";
    }
    return getPersonFirstName(selectedPerson) || selectedPerson.full_name;
  }, [selectedPerson]);

  const selectedPersonPhone = useMemo(() => {
    if (!selectedPerson) {
      return "";
    }
    return normalizeWhatsAppPhone(getPersonPhone(selectedPerson));
  }, [selectedPerson]);

  useEffect(() => {
    if (mode !== "person" || !selectedPersonId) {
      return;
    }
    const personChanged = previousPersonIdRef.current !== selectedPersonId;
    if (personChanged) {
      setWhatsAppMessage(buildDefaultWhatsAppMessage(selectedPersonName, cards));
      previousPersonIdRef.current = selectedPersonId;
    }
  }, [cards, mode, selectedPersonId, selectedPersonName]);

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId]
    );
  };

  const selectAllCards = () => {
    setSelectedCardIds(cards.map((card) => card.id));
  };

  const clearCardSelection = () => {
    setSelectedCardIds([]);
  };

  const handlePrepareWhatsApp = () => {
    if (selectedCards.length === 0) {
      enqueueSnackbar("Selecciona al menos una tarjeta para enviar.", { variant: "warning" });
      return;
    }

    const message =
      whatsAppMessage.trim() || buildDefaultWhatsAppMessage(selectedPersonName, selectedCards);
    const whatsappUrl = selectedPersonPhone
      ? `https://web.whatsapp.com/send?phone=${encodeURIComponent(
          selectedPersonPhone
        )}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
    enqueueSnackbar("WhatsApp Web abierto con texto y links para calendario.", {
      variant: "success",
    });
  };

  return (
    <Stack gap={2}>
      <Typography variant="h4">Tarjetas de asignacion</Typography>
      <Typography color="text.secondary">
        Genera tarjetas individuales para lectura biblica y seamos mejores maestros.
      </Typography>
      {!activeProgramId ? (
        <Alert severity="warning">Selecciona un programa actual para imprimir.</Alert>
      ) : null}
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_event, value) => value && setMode(value)}
      >
        <ToggleButton value="range">Rango de semanas</ToggleButton>
        <ToggleButton value="assignment">Asignacion especifica</ToggleButton>
        <ToggleButton value="person">Todas por persona</ToggleButton>
      </ToggleButtonGroup>

      {mode === "range" ? (
        <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems="center">
          <FormControl sx={{ minWidth: 240 }} disabled={!activeProgramId}>
            <InputLabel id="start-week-cards">Semana inicio</InputLabel>
            <Select
              labelId="start-week-cards"
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
          <FormControl sx={{ minWidth: 240 }} disabled={!activeProgramId}>
            <InputLabel id="end-week-cards">Semana fin</InputLabel>
            <Select
              labelId="end-week-cards"
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
          <Button variant="contained" onClick={() => window.print()} disabled={cards.length === 0}>
            Imprimir
          </Button>
        </Stack>
      ) : null}

      {mode === "assignment" ? (
        <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems="center">
          <FormControl sx={{ minWidth: 360 }} disabled={!activeProgramId}>
            <InputLabel id="assignment-select">Asignacion</InputLabel>
            <Select
              labelId="assignment-select"
              value={selectedAssignmentId ?? ""}
              label="Asignacion"
              onChange={(event) => setSelectedAssignmentId(String(event.target.value))}
            >
              {assignmentOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  Semana {option.week.week_number} · {option.week.date_range} · {option.assignment.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => window.print()} disabled={cards.length === 0}>
            Imprimir
          </Button>
        </Stack>
      ) : null}

      {mode === "person" ? (
        <Stack gap={2}>
          <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems="center">
            <FormControl sx={{ minWidth: 300 }} disabled={!activeProgramId}>
              <InputLabel id="person-select">Persona</InputLabel>
              <Select
                labelId="person-select"
                value={selectedPersonId ?? ""}
                label="Persona"
                onChange={(event) => setSelectedPersonId(String(event.target.value))}
              >
                {persons.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ width: "100%" }}
                    >
                      <span>{person.full_name}</span>
                      {personIdsWithAssignmentsInProgram.has(person.id) ? (
                        <Typography variant="caption" color="success.main" sx={{ ml: 2 }}>
                          Con asignaciones
                        </Typography>
                      ) : null}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={selectAllCards} disabled={cards.length === 0}>
              Seleccionar todas
            </Button>
            <Button variant="outlined" onClick={clearCardSelection} disabled={cards.length === 0}>
              Limpiar seleccion
            </Button>
            <Button variant="contained" onClick={() => window.print()} disabled={cards.length === 0}>
              Imprimir
            </Button>
          </Stack>

          <Typography color="text.secondary">
            Tarjetas seleccionadas: {selectedCards.length} de {cards.length}
          </Typography>

          <TextField
            label="Mensaje para WhatsApp"
            multiline
            minRows={4}
            value={whatsAppMessage}
            onChange={(event) => setWhatsAppMessage(event.target.value)}
            helperText="Se abre WhatsApp Web con este mensaje y links para agregar al calendario."
          />

          <Button variant="contained" onClick={handlePrepareWhatsApp} disabled={selectedCards.length === 0}>
            Abrir WhatsApp Web con texto + links calendario
          </Button>

          <Alert severity="info">
            Cada asignación agrega su link para crear un evento en Google Calendar desde el teléfono.
          </Alert>
        </Stack>
      ) : null}

      {cards.length === 0 ? (
        <Alert severity="info">
          Selecciona al menos una semana o asignacion con encargado asignado.
        </Alert>
      ) : (
        <PrintableAssignmentCards
          cards={cards}
          selectable={mode === "person"}
          selectedCardIds={selectedCardIdSet}
          onToggleCardSelection={toggleCardSelection}
        />
      )}
    </Stack>
  );
};



