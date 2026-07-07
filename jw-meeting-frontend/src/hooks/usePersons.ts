import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPerson, fetchPersons, updatePerson } from "../api/persons";
import type { Person } from "../types/person";

interface UsePersonsOptions {
  includeInactive?: boolean;
}

export const usePersons = (
  congregationId?: string | null,
  options?: UsePersonsOptions
) =>
  useQuery({
    queryKey: ["persons", congregationId, options?.includeInactive ? "all" : "active-only"],
    queryFn: () => {
      if (!congregationId) {
        return Promise.resolve([]);
      }
      return fetchPersons(congregationId).then((persons) =>
        options?.includeInactive ? persons : persons.filter((person) => person.active)
      );
    },
    enabled: Boolean(congregationId),
  });

export const useCreatePerson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Pick<Person, "congregation_id" | "full_name" | "email" | "extra_data">
    ) =>
      createPerson(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["persons", variables.congregation_id] });
    },
  });
};

export const useUpdatePerson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      personId,
      payload,
    }: {
      personId: string;
      payload: Pick<Person, "full_name" | "email" | "extra_data" | "active">;
    }) => updatePerson(personId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
  });
};
