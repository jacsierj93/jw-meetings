import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCongregation, fetchCongregations } from "../api/congregations";
import type { Congregation } from "../types/congregation";

export const useCongregations = () =>
  useQuery({
    queryKey: ["congregations"],
    queryFn: fetchCongregations,
  });

export const useCreateCongregation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Pick<Congregation, "name" | "settings">) =>
      createCongregation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["congregations"] });
    },
  });
};
