import "./printable-program.css";
import type { Assignment } from "../../types/assignment";
import type { Week } from "../../types/program";

interface PrintableProgramProps {
  weeks: Week[];
  assignmentsByWeek: Record<string, Assignment[]>;
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

const renderParticipant = (name?: string | null) => (
  <span className="participant-field">{name ?? ""}</span>
);

export const PrintableProgram = ({ weeks, assignmentsByWeek }: PrintableProgramProps) => {
  return (
    <div className="print-scope">
      <div className="container">
      {weeks.map((week, index) => {
        const assignments = assignmentsByWeek[week.id] ?? [];
        const extra = (week.extra_data ?? {}) as Record<string, unknown>;
        const isViajante = Boolean(extra.viajante);
        const assemblyText = String(extra.asamblea_conmemoracion ?? "").trim();
        const isAssembly = Boolean(assemblyText);
        const openingPrayer = getAssignmentByCode(assignments, "oracion_inicial");
        const closingPrayer = getAssignmentByCode(assignments, "oracion_final");
        const president = getAssignmentByCode(assignments, "presidente");

        const tesoros = getAssignmentsByCategory(assignments, "tesoros");
        const ministerio = getAssignmentsByCategory(assignments, "ministerio");
        const vidaCristiana = getAssignmentsByCategory(assignments, "vida_cristiana");
        const estudioBiblico = getAssignmentsByCategory(assignments, "estudio_biblico");

        const aperturaNumero =
          (week.songs as any)?.apertura?.numero ?? (week.songs as any)?.apertura ?? "";
        const cierreNumero =
          (week.songs as any)?.cierre?.numero ?? (week.songs as any)?.cierre ?? "";
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

        pushRow(
          <div key={`${week.id}-opening`} className="row" style={{ marginTop: "2px" }}>
            <div className="time">{formatTime(timeMinutes)}</div>
            <div className="title">
              <span className="bullet">♪</span>Cancion {aperturaNumero}
            </div>
            <div className="participants">
              <div>
                <span className="participant-label">Oracion:</span>{" "}
                {renderParticipant(openingPrayer?.assignee?.full_name)}
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
                {renderParticipant(tesoros[0].assignee?.full_name)}
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
              {renderParticipant(president?.assignee?.full_name)}
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
                  {renderParticipant(tesoros[1].assignee?.full_name)}
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
          const duration =
            assignment.duration ?? assignment.assignment_type.default_duration ?? 0;
          const hasAssistant = assignment.assignment_type.requires_assistant;
          pushRow(
            <div key={assignment.id} className="row">
              <div className="time">{formatTime(timeMinutes)}</div>
              <div className="number">{ministerioIndex++}.</div>
              <div className="title">
                {assignment.title} <span className="duration">({duration} mins.)</span>
              </div>
              <div className="participants">
                <div className="participant-group">
                  <span className="participant-label">Estudiante/Ayudante:</span>{" "}
                  {renderParticipant(assignment.assignee?.full_name)}
                  {hasAssistant ? (
                    <>
                      <span className="participant-separator"> / </span>
                      {renderParticipant(assignment.assistant?.full_name)}
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
          const duration =
            assignment.duration ?? assignment.assignment_type.default_duration ?? 0;
          pushRow(
            <div key={assignment.id} className="row">
              <div className="time">{formatTime(timeMinutes)}</div>
              <div className="title">
                {assignment.title} <span className="duration">({duration} mins.)</span>
              </div>
              <div className="participants">
                {renderParticipant(assignment.assignee?.full_name)}
              </div>
            </div>,
            duration
          );
        });

        if (isViajante) {
          pushRow(
            <div key={`${week.id}-estudio`} className="row">
              <div className="time">{formatTime(timeMinutes)}</div>
              <div className="title visit-title">
                VISITA DEL SUPERINTENDENTE DE CIRCUITO
              </div>
            </div>,
            30
          );
        } else {
          pushRow(
            <div key={`${week.id}-estudio`} className="row">
              <div className="time">{formatTime(timeMinutes)}</div>
              <div className="title">
                Estudio biblico de la congregacion{" "}
                <span className="duration">(30 mins.)</span>
              </div>
              <div className="participants">
                <div className="participant-group">
                  <span className="participant-label">Conductor/Lector:</span>{" "}
                  {renderParticipant(estudioBiblico[0]?.assignee?.full_name)}
                  <span className="participant-separator"> / </span>
                  {renderParticipant(estudioBiblico[1]?.assignee?.full_name)}
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
              <span className="bullet">♪</span>Cancion {cierreNumero}
            </div>
            <div className="participants">
              <div>
                <span className="participant-label">Oracion:</span>{" "}
                {renderParticipant(closingPrayer?.assignee?.full_name)}
              </div>
            </div>
          </div>
        );

        return (
          <div
            key={week.id}
            className={`week-block${index > 0 ? " page-break" : ""}${
              index === 0 ? " first-week" : ""
            }`}
          >
            {index === 0 ? (
              <h1>Programa para la reunion de entre semana</h1>
            ) : (
              <div className="week-separator" />
            )}

            <div className="header-row">
              <div className="date-reference">
                {week.date_range} {week.reading ? `- ${week.reading}` : ""}
              </div>
              <div className="right-labels">
                <div>
                  <span className="label">Presidente:</span>{" "}
                  {renderParticipant(president?.assignee?.full_name)}
                </div>
              </div>
            </div>
            <div className="rows-wrapper">
              {rows}
              {isAssembly ? (
                <div className="assembly-overlay">
                  <div className="assembly-text">{assemblyText}</div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

