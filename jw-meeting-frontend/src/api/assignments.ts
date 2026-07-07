import { apiClient } from "./client";
import type { Assignment } from "../types/assignment";

export const fetchAssignmentsByWeek = async (weekId: string): Promise<Assignment[]> => {
  const response = await apiClient.get(`/api/v1/assignments/week/${weekId}`);
  return response.data;
};

export const reassignAssignment = async (
  assignmentId: string,
  personId: string | null
) => {
  const response = await apiClient.post(`/api/v1/assignments/${assignmentId}/reassign`, {
    new_assignee_id: personId,
  });
  return response.data;
};

export const updateAssistant = async (
  assignmentId: string,
  assistantId: string | null
) => {
  const response = await apiClient.post(`/api/v1/assignments/${assignmentId}/assistant`, {
    assistant_id: assistantId,
  });
  return response.data;
};

export const unassignAssignment = async (assignmentId: string, reason?: string | null) => {
  const response = await apiClient.post(`/api/v1/assignments/${assignmentId}/unassign`, {
    reason: reason ?? null,
  });
  return response.data;
};
