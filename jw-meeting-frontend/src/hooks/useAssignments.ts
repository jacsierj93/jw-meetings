import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAssignmentsByWeek,
  reassignAssignment,
  unassignAssignment,
  updateAssistant,
} from "../api/assignments";

export const useAssignments = (weekId?: string | null) =>
  useQuery({
    queryKey: ["assignments", weekId],
    queryFn: () => {
      if (!weekId) {
        return Promise.resolve([]);
      }
      return fetchAssignmentsByWeek(weekId);
    },
    enabled: Boolean(weekId),
  });

export const useReassignAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      assignmentId: string;
      personId: string | null;
      weekId: string;
    }) => reassignAssignment(variables.assignmentId, variables.personId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.weekId],
      });
    },
  });
};

export const useUpdateAssistant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      assignmentId: string;
      assistantId: string | null;
      weekId: string;
    }) => updateAssistant(variables.assignmentId, variables.assistantId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.weekId],
      });
    },
  });
};

export const useUnassignAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { assignmentId: string; weekId: string; reason?: string }) =>
      unassignAssignment(variables.assignmentId, variables.reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.weekId],
      });
    },
  });
};
