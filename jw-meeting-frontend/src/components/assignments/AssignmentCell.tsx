import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { AssignmentDetailDialog } from "./AssignmentDetailDialog";
import type { Assignment } from "../../types/assignment";
import type { Person } from "../../types/person";
import {
  canAssignPersonToAssignmentInWeek,
  isPersonAbsentOnWeek,
} from "../../utils/assignmentRules";

interface AssignmentCellProps {
  assignment: Assignment;
  assignmentsForWeek: Assignment[];
  persons: Person[];
  onReassign: (assignmentId: string, personId: string | null) => void;
  onAssistantChange: (assignmentId: string, assistantId: string | null) => void;
  detailText?: string | null;
  detailTitle?: string | null;
  weekDate?: string | null;
  disabled?: boolean;
}

export const AssignmentCell = ({
  assignment,
  assignmentsForWeek,
  persons,
  onReassign,
  onAssistantChange,
  detailText,
  detailTitle,
  weekDate,
  disabled,
}: AssignmentCellProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const title = assignment.title?.trim() || assignment.assignment_type.name;
  const duration =
    assignment.duration ?? assignment.assignment_type.default_duration ?? null;

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems={{ xs: "flex-start", md: "center" }}
      gap={2}
      sx={{
        p: 1.5,
        borderRadius: 3,
        border: "1px solid rgba(30, 95, 116, 0.1)",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1">{title}</Typography>
        {duration ? (
          <Typography variant="body2" color="text.secondary">
            Duracion: {duration} min
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ minWidth: 220 }}>
        <Typography variant="caption" color="text.secondary">
          Asignado
        </Typography>
        <Select
          fullWidth
          size="small"
          value={assignment.assignee?.id ?? ""}
          displayEmpty
          disabled={disabled || persons.length === 0}
          onChange={(event) => {
            const nextId = String(event.target.value);
            if (nextId === (assignment.assignee?.id ?? "")) {
              return;
            }
            onReassign(assignment.id, nextId || null);
          }}
        >
          <MenuItem value="">
            <em>Sin asignar</em>
          </MenuItem>
          {persons
            .map((person) => {
              const isAbsent = isPersonAbsentOnWeek(person, weekDate);
              const isAllowed = canAssignPersonToAssignmentInWeek(
                person,
                assignment,
                assignmentsForWeek,
                weekDate,
                "assignee"
              );
              const isCurrent = person.id === assignment.assignee?.id;
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
      </Box>
      <Box sx={{ minWidth: 220 }}>
        <Typography variant="caption" color="text.secondary">
          Ayudante
        </Typography>
        {assignment.assignment_type.requires_assistant ? (
          <Select
            fullWidth
            size="small"
            value={assignment.assistant?.id ?? ""}
            displayEmpty
            disabled={disabled || persons.length === 0}
            onChange={(event) => {
              const nextId = String(event.target.value);
              if (nextId === (assignment.assistant?.id ?? "")) {
                return;
              }
              onAssistantChange(assignment.id, nextId || null);
            }}
          >
            <MenuItem value="">
              <em>Sin asignar</em>
            </MenuItem>
            {persons.map((person) => {
              const isAbsent = isPersonAbsentOnWeek(person, weekDate);
              const isAllowed = canAssignPersonToAssignmentInWeek(
                person,
                assignment,
                assignmentsForWeek,
                weekDate,
                "assistant"
              );
              const isCurrent = person.id === assignment.assistant?.id;
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
        ) : (
          <Typography>No requiere</Typography>
        )}
      </Box>
      <Box sx={{ minWidth: 140 }}>
        <Typography variant="caption" color="text.secondary">
          Detalle
        </Typography>
        <Button
          variant="outlined"
          size="small"
          disabled={!detailText}
          onClick={() => setDetailsOpen(true)}
        >
          Ver
        </Button>
      </Box>
      <AssignmentDetailDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={detailTitle ?? title}
        detail={detailText ?? null}
      />
    </Stack>
  );
};
