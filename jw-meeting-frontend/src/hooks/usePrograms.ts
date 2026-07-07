import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteProgram, deleteWeek, fetchPrograms, importProgram } from "../api/programs";
import type { Program } from "../types/program";

export const usePrograms = (congregationId?: string | null) =>
  useQuery({
    queryKey: ["programs", congregationId],
    queryFn: () => {
      if (!congregationId) {
        return Promise.resolve([]);
      }
      return fetchPrograms(congregationId);
    },
    enabled: Boolean(congregationId),
  });

export const useImportProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData) => importProgram(payload),
    onSuccess: (program: Program) => {
      queryClient.invalidateQueries({
        queryKey: ["programs", program.congregation_id],
      });
    },
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (programId: string) => deleteProgram(programId),
    onSuccess: (program: Program) => {
      queryClient.invalidateQueries({
        queryKey: ["programs", program.congregation_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["weeks", program.id],
      });
    },
  });
};

export const useDeleteWeek = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { weekId: string; programId: string }) =>
      deleteWeek(variables.weekId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["weeks", variables.programId],
      });
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.weekId],
      });
    },
  });
};
