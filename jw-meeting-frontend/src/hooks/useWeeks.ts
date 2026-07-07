import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWeeks, updateWeek } from "../api/programs";
import type { Week } from "../types/program";

export const useWeeks = (programId?: string | null) =>
  useQuery({
    queryKey: ["weeks", programId],
    queryFn: () => {
      if (!programId) {
        return Promise.resolve([]);
      }
      return fetchWeeks(programId);
    },
    enabled: Boolean(programId),
  });

export const useUpdateWeek = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      weekId: string;
      programId: string;
      extra_data: Record<string, unknown>;
    }) => updateWeek(variables.weekId, { extra_data: variables.extra_data }),
    onSuccess: (week: Week, variables) => {
      queryClient.invalidateQueries({ queryKey: ["weeks", variables.programId] });
      queryClient.invalidateQueries({ queryKey: ["weeks", week.program_id] });
    },
  });
};
