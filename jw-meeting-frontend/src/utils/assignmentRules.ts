import type { Assignment } from "../types/assignment";
import type { Person } from "../types/person";

export const isStudentAssignment = (assignment: Assignment) =>
  assignment.assignment_type.category === "ministerio" ||
  assignment.assignment_type.code === "lectura_biblica";

export const isPrayerAssignmentCode = (code: string) =>
  code === "oracion_inicial" || code === "oracion_final";

export const isStudyRoleAssignmentCode = (code: string) =>
  code === "conductor_estudio" || code === "lector_estudio";

export const isPresidentAssignmentCode = (code: string) => code === "presidente";

export const isExcludedFromLoadCount = (assignment: Assignment) =>
  isPresidentAssignmentCode(assignment.assignment_type.code) ||
  isPrayerAssignmentCode(assignment.assignment_type.code);

export const isPersonInAssignment = (assignment: Assignment, personId: string) =>
  assignment.assignee?.id === personId || assignment.assistant?.id === personId;

export const getPersonAssignmentTypes = (person: Person): string[] => {
  const raw = person.extra_data?.assignment_types;
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((item) => typeof item === "string");
  }
  return [];
};

export const getAbsenceRange = (person: Person) => {
  const raw = person.extra_data?.absence;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const start = (raw as { start?: string }).start;
  const end = (raw as { end?: string }).end;
  if (!start || !end) {
    return null;
  }
  return { start, end };
};

export const getPersonFirstName = (person: Person) => {
  const raw = person.extra_data?.first_name;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return "";
};

export const getPersonPhone = (person: Person) => {
  const raw = person.extra_data?.phone;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return "";
};

const isDateInRange = (date: string, start: string, end: string) => {
  const dateValue = new Date(date).getTime();
  const startValue = new Date(start).getTime();
  const endValue = new Date(end).getTime();
  if ([dateValue, startValue, endValue].some((value) => Number.isNaN(value))) {
    return false;
  }
  return dateValue >= startValue && dateValue <= endValue;
};

export const isPersonAbsentOnWeek = (person: Person, weekDate?: string | null) => {
  if (!weekDate) {
    return false;
  }
  const absence = getAbsenceRange(person);
  if (!absence) {
    return false;
  }
  return isDateInRange(weekDate, absence.start, absence.end);
};

export const canPersonDoAssignmentType = (person: Person, assignment: Assignment) => {
  const allowedTypes = getPersonAssignmentTypes(person);
  if (allowedTypes.length === 0) {
    return isStudentAssignment(assignment);
  }
  const code = assignment.assignment_type.code;
  if (allowedTypes.includes(code)) {
    return true;
  }
  if (allowedTypes.includes("presidente") && code === "presidente") {
    return true;
  }
  if (allowedTypes.includes("oraciones")) {
    if (code === "oracion_inicial" || code === "oracion_final" || code === "lector_estudio") {
      return true;
    }
  }
  if (allowedTypes.includes("vida_ministerio")) {
    if (assignment.assignment_type.category === "vida_cristiana") {
      return true;
    }
    if (assignment.assignment_type.category === "tesoros") {
      return true;
    }
    if (code === "conductor_estudio") {
      return true;
    }
  }
  return false;
};

export const canAssignPersonToAssignment = (
  person: Person,
  assignment: Assignment,
  weekDate?: string | null
) => {
  if (isPersonAbsentOnWeek(person, weekDate)) {
    return false;
  }
  return canPersonDoAssignmentType(person, assignment);
};

export const getAssignmentBlockReason = (
  personId: string,
  assignment: Assignment,
  assignmentsInWeek: Assignment[],
  role?: "assignee" | "assistant"
) => {
  const code = assignment.assignment_type.code;
  if (isStudentAssignment(assignment)) {
    const hasOtherStudentAssignment = assignmentsInWeek.some(
      (item) =>
        item.id !== assignment.id &&
        isStudentAssignment(item) &&
        isPersonInAssignment(item, personId)
    );
    const hasSameAssignmentOtherRole =
      role === "assistant"
        ? assignment.assignee?.id === personId
        : role === "assignee"
          ? assignment.assistant?.id === personId
          : false;
    if (hasOtherStudentAssignment || hasSameAssignmentOtherRole) {
      return "La persona ya tiene una asignacion estudiantil esta semana.";
    }
  }
  if (isPrayerAssignmentCode(code)) {
    const hasPrayerAssignment = assignmentsInWeek.some(
      (item) =>
        item.id !== assignment.id &&
        isPrayerAssignmentCode(item.assignment_type.code) &&
        isPersonInAssignment(item, personId)
    );
    if (hasPrayerAssignment) {
      return "Las oraciones son mutuamente excluyentes.";
    }
  }
  if (isStudyRoleAssignmentCode(code)) {
    const hasStudyRole = assignmentsInWeek.some(
      (item) =>
        item.id !== assignment.id &&
        isStudyRoleAssignmentCode(item.assignment_type.code) &&
        isPersonInAssignment(item, personId)
    );
    if (hasStudyRole) {
      return "Conductor y lector del estudio son mutuamente excluyentes.";
    }
  }
  return null;
};

export const canAssignPersonToAssignmentInWeek = (
  person: Person,
  assignment: Assignment,
  assignmentsInWeek: Assignment[],
  weekDate?: string | null,
  role?: "assignee" | "assistant"
) => {
  if (!canAssignPersonToAssignment(person, assignment, weekDate)) {
    return false;
  }
  return !getAssignmentBlockReason(person.id, assignment, assignmentsInWeek, role);
};

export const countAssignmentsForPerson = (
  assignmentsInWeek: Assignment[],
  personId: string,
  excludeAssignmentId?: string | null
) =>
  assignmentsInWeek.filter((assignment) => {
    if (excludeAssignmentId && assignment.id === excludeAssignmentId) {
      return false;
    }
    if (isExcludedFromLoadCount(assignment)) {
      return false;
    }
    return isPersonInAssignment(assignment, personId);
  }).length;

export const filterEligiblePersons = (
  persons: Person[],
  assignment: Assignment,
  weekDate?: string | null
) => persons.filter((person) => canAssignPersonToAssignment(person, assignment, weekDate));

export const getAssignmentCategoryLabel = (assignment: Assignment) => {
  if (assignment.assignment_type.code === "lectura_biblica") {
    return "Lectura de la Biblia";
  }
  if (assignment.assignment_type.category === "ministerio") {
    return "Seamos mejores maestros";
  }
  return assignment.assignment_type.name;
};
