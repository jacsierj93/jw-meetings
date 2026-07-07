import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { AssignmentDetailDialog } from "./AssignmentDetailDialog";
import {
  canAssignPersonToAssignmentInWeek,
  isPersonAbsentOnWeek,
} from "../../utils/assignmentRules";
import type { Assignment } from "../../types/assignment";
import type { Person } from "../../types/person";
import type { Week } from "../../types/program";
import { useState } from "react";

interface GridViewProps {
  assignments: Assignment[];
  persons: Person[];
  onReassign: (assignmentId: string, personId: string | null) => void;
  onAssistantChange: (assignmentId: string, assistantId: string | null) => void;
  isUpdating?: boolean;
  week?: Week | null;
}

export const GridView = ({
  assignments,
  persons,
  onReassign,
  onAssistantChange,
  isUpdating,
  week,
}: GridViewProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState<string | null>(null);
  const [detailsText, setDetailsText] = useState<string | null>(null);
  const rows = [...assignments].sort((a, b) => a.order_index - b.order_index);
  const extra = (week?.extra_data ?? {}) as Record<string, unknown>;
  const isAssembly = Boolean(extra.asamblea_conmemoracion);
  const isViajante = Boolean(extra.viajante);

  const renderBlockedSelect = (label: string) => (
    <Select fullWidth size="small" value="" displayEmpty disabled>
      <MenuItem value="">
        <em>{label}</em>
      </MenuItem>
    </Select>
  );

  const getMinistryDetail = (assignment: Assignment) => {
    if (!week?.content?.ministry_items) {
      return null;
    }
    if (assignment.assignment_type.category !== "ministerio") {
      return null;
    }
    const ministryAssignments = rows
      .filter((item) => item.assignment_type.category === "ministerio")
      .sort((a, b) => a.order_index - b.order_index);
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

  const columns: GridColDef<Assignment>[] = [
    { field: "order_index", headerName: "#", width: 80 },
    {
      field: "assignment_type",
      headerName: "Tipo",
      flex: 1,
      minWidth: 220,
      valueGetter: (_value, row) => row.assignment_type.name,
    },
    { field: "title", headerName: "Asignacion", flex: 1.4, minWidth: 220 },
    {
      field: "assignee",
      headerName: "Asignado",
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => {
        if (isAssembly) {
          return renderBlockedSelect("Asamblea/Conmemoracion");
        }
        if (isViajante && row.assignment_type.category === "estudio_biblico") {
          return renderBlockedSelect("Visita del superintendente");
        }
        return (
          <Select
            fullWidth
            size="small"
            value={row.assignee?.id ?? ""}
            displayEmpty
            disabled={isUpdating || persons.length === 0}
            onChange={(event) => {
              const nextId = String(event.target.value);
              if (nextId === (row.assignee?.id ?? "")) {
                return;
              }
              onReassign(row.id, nextId || null);
            }}
          >
            <MenuItem value="">
              <em>Sin asignar</em>
            </MenuItem>
            {persons
              .map((person) => {
                const isAbsent = isPersonAbsentOnWeek(person, week?.week_date);
                const isAllowed = canAssignPersonToAssignmentInWeek(
                  person,
                  row,
                  assignments,
                  week?.week_date,
                  "assignee"
                );
                const isCurrent = person.id === row.assignee?.id;
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
        );
      },
    },
    {
      field: "assistant",
      headerName: "Ayudante",
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => {
        if (!row.assignment_type.requires_assistant) {
          return "No requiere";
        }
        if (isAssembly) {
          return renderBlockedSelect("Asamblea/Conmemoracion");
        }
        if (isViajante && row.assignment_type.category === "estudio_biblico") {
          return renderBlockedSelect("Visita del superintendente");
        }
        return (
          <Select
            fullWidth
            size="small"
            value={row.assistant?.id ?? ""}
            displayEmpty
            disabled={isUpdating || persons.length === 0}
            onChange={(event) => {
              const nextId = String(event.target.value);
              if (nextId === (row.assistant?.id ?? "")) {
                return;
              }
              onAssistantChange(row.id, nextId || null);
            }}
          >
            <MenuItem value="">
              <em>Sin asignar</em>
            </MenuItem>
            {persons.map((person) => {
              const isAbsent = isPersonAbsentOnWeek(person, week?.week_date);
              const isAllowed = canAssignPersonToAssignmentInWeek(
                person,
                row,
                assignments,
                week?.week_date,
                "assistant"
              );
              const isCurrent = person.id === row.assistant?.id;
              if (!isAllowed && !isCurrent) {
                return null;
              }
              return (
                <MenuItem
                  key={person.id}
                  value={person.id}
                  disabled={isAbsent}
                >
                  {person.full_name}
                  {isAbsent ? " (Ausente)" : ""}
                </MenuItem>
              );
            })}
          </Select>
        );
      },
    },
    {
      field: "duration",
      headerName: "Duracion",
      width: 120,
      valueGetter: (_value, row) => (row.duration ? `${row.duration} min` : "-"),
    },
    {
      field: "details",
      headerName: "Detalle",
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }) => {
        const detail = getMinistryDetail(row);
        return (
          <Button
            size="small"
            variant="outlined"
            disabled={!detail?.detail}
            onClick={() => {
              setDetailsTitle(detail?.title ?? row.title);
              setDetailsText(detail?.detail ?? null);
              setDetailsOpen(true);
            }}
          >
            Ver
          </Button>
        );
      },
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ height: 520, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={Boolean(isUpdating)}
        getRowId={(row) => row.id}
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
        sx={{
          borderRadius: 4,
          background: "#fff",
          borderColor: "rgba(30, 95, 116, 0.12)",
        }}
        slots={{
          noRowsOverlay: () => (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">Sin asignaciones para esta semana.</Typography>
            </Box>
          ),
        }}
      />
      </Box>
      <AssignmentDetailDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={detailsTitle}
        detail={detailsText}
      />
    </Box>
  );
};
