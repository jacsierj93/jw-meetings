import "./ProgramView.css";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { AssignmentDetailDialog } from "./AssignmentDetailDialog";
import type { Assignment } from "../../types/assignment";
import type { Person } from "../../types/person";
import type { Week } from "../../types/program";
import {
  canAssignPersonToAssignmentInWeek,
  isPersonAbsentOnWeek,
} from "../../utils/assignmentRules";

interface ProgramViewProps {
  week?: Week | null;
  assignments: Assignment[];
  persons: Person[];
  onReassign: (assignmentId: string, personId: string | null) => void;
  onAssistantChange: (assignmentId: string, assistantId: string | null) => void;
  isUpdating?: boolean;
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
};

const getAssignmentByCode = (assignments: Assignment[], code: string) =>
  assignments.find((assignment) => assignment.assignment_type.code === code);

const getAssignmentsByCategory = (assignments: Assignment[], category: string) =>
  assignments
    .filter((assignment) => assignment.assignment_type.category === category)
    .sort((a, b) => a.order_index - b.order_index);

export const ProgramView = ({
  week,
  assignments,
  persons,
  onReassign,
  onAssistantChange,
  isUpdating,
}: ProgramViewProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState<string | null>(null);
  const [detailsText, setDetailsText] = useState<string | null>(null);

  const ministryAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.assignment_type.category === "ministerio")
        .sort((a, b) => a.order_index - b.order_index),
    [assignments]
  );

  const getMinistryDetail = (assignment: Assignment) => {
    if (!week?.content?.ministry_items) {
      return null;
    }
    const index = ministryAssignments.findIndex((item) => item.id === assignment.id);
    if (index === -1) {
      return null;
    }
    const item = week.content.ministry_items[index];
    if (!item) {
      return null;
    }
    return {
      title: item.titulo ?? assignment.title,
      detail: item.detail?.raw_text ?? null,
    };
  };

  const extra = (week?.extra_data ?? {}) as Record<string, unknown>;
  const isAssembly = Boolean(String(extra.asamblea_conmemoracion ?? "").trim());
  const viajante = Boolean(extra.viajante);

  const renderPersonSelect = (
    assignment: Assignment,
    value: string | null | undefined,
    role: "assignee" | "assistant"
  ) => {
    const weekDate = week?.week_date ?? null;
    if (isAssembly) {
      return (
        <TextField
          select
          size="small"
          value=""
          variant="standard"
          SelectProps={{ native: true }}
          InputProps={{ disableUnderline: true }}
          disabled
          sx={{ minWidth: 160 }}
        >
          <option value="">Asamblea/Conmemoracion</option>
        </TextField>
      );
    }
    const options = persons
      .filter((person) => {
        if (value && person.id === value) {
          return true;
        }
        return canAssignPersonToAssignmentInWeek(
          person,
          assignment,
          assignments,
          weekDate,
          role
        );
      })
      .map((person) => {
        const isAbsent = isPersonAbsentOnWeek(person, weekDate);
        return (
          <option key={person.id} value={person.id} disabled={isAbsent}>
            {person.full_name}
            {isAbsent ? " (Ausente)" : ""}
          </option>
        );
      });

    return (
      <TextField
        select
        size="small"
        value={value ?? ""}
        variant="standard"
        SelectProps={{ native: true }}
        InputProps={{ disableUnderline: true }}
        onChange={(event) => {
          if (isUpdating || isAssembly) {
            return;
          }
          const nextId = String(event.target.value || "");
          if (role === "assignee") {
            onReassign(assignment.id, nextId || null);
          } else {
            onAssistantChange(assignment.id, nextId || null);
          }
        }}
        sx={{ minWidth: 160 }}
      >
        <option value="">Sin asignar</option>
        {options}
      </TextField>
    );
  };

  if (!week) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography color="text.secondary">Selecciona una semana.</Typography>
        </CardContent>
      </Card>
    );
  }

  const openingPrayer = getAssignmentByCode(assignments, "oracion_inicial");
  const closingPrayer = getAssignmentByCode(assignments, "oracion_final");
  const president = getAssignmentByCode(assignments, "presidente");

  const tesoros = getAssignmentsByCategory(assignments, "tesoros");
  const ministerio = getAssignmentsByCategory(assignments, "ministerio");
  const vidaCristiana = getAssignmentsByCategory(assignments, "vida_cristiana");
  const estudioBiblico = getAssignmentsByCategory(assignments, "estudio_biblico");

  const aperturaNumero =
    (week.songs as unknown as { apertura?: { numero?: number } | number })?.apertura ??
    "";
  const cierreNumero =
    (week.songs as unknown as { cierre?: { numero?: number } | number })?.cierre ?? "";
  const medioNumero = (week.songs as any)?.medio ?? null;

  let timeMinutes = 1200;
  let ministerioIndex = 4;
  const rows: JSX.Element[] = [];

  const pushRow = (node: JSX.Element, advanceMinutes?: number) => {
    rows.push(node);
    if (advanceMinutes) {
      timeMinutes += advanceMinutes;
    }
  };

  const openingSongNumber =
    typeof aperturaNumero === "number" ? aperturaNumero : (aperturaNumero as any)?.numero ?? "";
  const closingSongNumber =
    typeof cierreNumero === "number" ? cierreNumero : (cierreNumero as any)?.numero ?? "";

  pushRow(
    <div key={`${week.id}-opening`} className="row" style={{ marginTop: "2px" }}>
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="title">
        <span className="bullet">♪</span>Cancion {openingSongNumber}
      </div>
      <div className="participants">
        <div>
          <span className="participant-label">Oracion:</span>{" "}
          {openingPrayer
            ? renderPersonSelect(openingPrayer, openingPrayer.assignee?.id, "assignee")
            : null}
        </div>
      </div>
    </div>,
    5
  );

  pushRow(
    <div key={`${week.id}-intro`} className="row">
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="title">
        <span className="bullet">*</span>Palabras de introduccion{" "}
        <span className="duration">(1 min.)</span>
      </div>
    </div>,
    1
  );

  rows.push(
    <div key={`${week.id}-tesoros-header`} className="section-header">
      TESOROS DE LA BIBLIA
    </div>
  );

  if (tesoros[0]) {
    pushRow(
      <div key={`${week.id}-tesoros-1`} className="row">
        <div className="time">{formatTime(timeMinutes)}</div>
        <div className="number">1.</div>
        <div className="title">
          {tesoros[0].title} <span className="duration">(10 mins.)</span>
        </div>
        <div className="participants">
          {renderPersonSelect(tesoros[0], tesoros[0].assignee?.id, "assignee")}
        </div>
      </div>,
      10
    );
  }

  pushRow(
    <div key={`${week.id}-perlas`} className="row">
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="number">2.</div>
      <div className="title">
        Busquemos perlas escondidas <span className="duration">(10 mins.)</span>
      </div>
      <div className="participants">
        {president ? renderPersonSelect(president, president.assignee?.id, "assignee") : null}
      </div>
    </div>,
    10
  );

  if (tesoros[1]) {
    pushRow(
      <div key={`${week.id}-lectura`} className="row">
        <div className="time">{formatTime(timeMinutes)}</div>
        <div className="number">3.</div>
        <div className="title">
          Lectura de la Biblia <span className="duration">(4 mins.)</span>
        </div>
        <div className="participants">
          <div>
            <span className="participant-label">Estudiante:</span>{" "}
            {renderPersonSelect(tesoros[1], tesoros[1].assignee?.id, "assignee")}
          </div>
        </div>
      </div>,
      4
    );
  }

  rows.push(
    <div key={`${week.id}-ministerio-header`} className="section-header gold">
      SEAMOS MEJORES MAESTROS
    </div>
  );

  ministerio.forEach((assignment) => {
    const duration = assignment.duration ?? assignment.assignment_type.default_duration ?? 0;
    const hasAssistant = assignment.assignment_type.requires_assistant;
    const detail = getMinistryDetail(assignment);
    pushRow(
      <div key={assignment.id} className="row">
        <div className="time">{formatTime(timeMinutes)}</div>
        <div className="number">{ministerioIndex++}.</div>
        <div className="title">
          {assignment.title} <span className="duration">({duration} mins.)</span>
          {detail?.detail ? (
            <Button
              size="small"
              variant="text"
              sx={{ ml: 1, textTransform: "none" }}
              onClick={() => {
                setDetailsTitle(detail.title);
                setDetailsText(detail.detail);
                setDetailsOpen(true);
              }}
            >
              Detalle
            </Button>
          ) : null}
        </div>
        <div className="participants">
          <div className="participant-group">
            <span className="participant-label">Estudiante/Ayudante:</span>{" "}
            {renderPersonSelect(assignment, assignment.assignee?.id, "assignee")}
            {hasAssistant ? (
              <>
                <span className="participant-separator"> / </span>
                {renderPersonSelect(assignment, assignment.assistant?.id, "assistant")}
              </>
            ) : null}
          </div>
        </div>
      </div>,
      duration
    );
  });

  rows.push(
    <div key={`${week.id}-vida-header`} className="section-header red">
      NUESTRA VIDA CRISTIANA
    </div>
  );

  if (medioNumero) {
    pushRow(
      <div key={`${week.id}-medio`} className="row">
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="title">
        <span className="bullet">♪</span>Cancion {medioNumero}
      </div>
    </div>,
    3
  );
  }

  vidaCristiana.forEach((assignment) => {
    const duration = assignment.duration ?? assignment.assignment_type.default_duration ?? 0;
    pushRow(
      <div key={assignment.id} className="row">
        <div className="time">{formatTime(timeMinutes)}</div>
        <div className="title">
          {assignment.title} <span className="duration">({duration} mins.)</span>
        </div>
        <div className="participants">
          {renderPersonSelect(assignment, assignment.assignee?.id, "assignee")}
        </div>
      </div>,
      duration
    );
  });

  if (viajante) {
    pushRow(
    <div key={`${week.id}-estudio`} className="row">
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="title visit-title">VISITA DEL SUPERINTENDENTE DE CIRCUITO</div>
    </div>,
      30
    );
  } else {
    pushRow(
      <div key={`${week.id}-estudio`} className="row">
        <div className="time">{formatTime(timeMinutes)}</div>
        <div className="title">
          Estudio biblico de la congregacion <span className="duration">(30 mins.)</span>
        </div>
        <div className="participants">
          <div className="participant-group">
            <span className="participant-label">Conductor/Lector:</span>{" "}
            {estudioBiblico[0]
              ? renderPersonSelect(
                  estudioBiblico[0],
                  estudioBiblico[0].assignee?.id,
                  "assignee"
                )
              : null}
            <span className="participant-separator"> / </span>
            {estudioBiblico[1]
              ? renderPersonSelect(
                  estudioBiblico[1],
                  estudioBiblico[1].assignee?.id,
                  "assignee"
                )
              : null}
          </div>
        </div>
      </div>,
      30
    );
  }

  pushRow(
    <div key={`${week.id}-conclusion`} className="row">
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="title">
        <span className="bullet">*</span>Palabras de conclusion{" "}
        <span className="duration">(3 min.)</span>
      </div>
    </div>,
    3
  );

  rows.push(
    <div key={`${week.id}-closing`} className="row">
      <div className="time">{formatTime(timeMinutes)}</div>
      <div className="title">
        <span className="bullet">♪</span>Cancion {closingSongNumber}
      </div>
      <div className="participants">
        <div>
          <span className="participant-label">Oracion:</span>{" "}
          {closingPrayer
            ? renderPersonSelect(closingPrayer, closingPrayer.assignee?.id, "assignee")
            : null}
        </div>
      </div>
    </div>
  );

  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Stack gap={2}>
          <Stack gap={0.5}>
            <Typography variant="h6">Programa interactivo</Typography>
            <Typography color="text.secondary">
              {week.date_range} {week.reading ? `- ${week.reading}` : ""}
            </Typography>
          </Stack>
          {isAssembly ? (
            <Typography color="error" variant="body2">
              Semana bloqueada por asamblea o conmemoracion.
            </Typography>
          ) : null}
          {assignments.length === 0 ? (
            <Typography color="text.secondary">No hay asignaciones cargadas.</Typography>
          ) : (
            <div className="program-scope">
              <div className="container">
                <div className="week-block first-week">
                  <h1>Programa para la reunion de entre semana</h1>
                  <div className="header-row">
                    <div className="date-reference">
                      {week.date_range} {week.reading ? `- ${week.reading}` : ""}
                    </div>
                    <div className="right-labels">
                      <div>
                        <span className="label">Presidente:</span>{" "}
                        {president
                          ? renderPersonSelect(president, president.assignee?.id, "assignee")
                          : null}
                      </div>
                    </div>
                  </div>
                  {rows}
                </div>
              </div>
            </div>
          )}
        </Stack>
      </CardContent>
      <AssignmentDetailDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={detailsTitle}
        detail={detailsText}
      />
    </Card>
  );
};
