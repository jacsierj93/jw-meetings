import { apiClient } from "./client";
import type { Person } from "../types/person";

const toBooleanActive = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
};

const normalizePerson = (person: Person): Person => ({
  ...person,
  active: toBooleanActive(person.active),
});

export const fetchPersons = async (congregationId: string): Promise<Person[]> => {
  const response = await apiClient.get("/api/v1/programs/persons", {
    params: { congregation_id: congregationId },
  });
  return (response.data as Person[]).map(normalizePerson);
};

export const createPerson = async (
  payload: Pick<Person, "congregation_id" | "full_name" | "email" | "extra_data">
): Promise<Person> => {
  const response = await apiClient.post("/api/v1/programs/persons", payload);
  return normalizePerson(response.data as Person);
};

export const updatePerson = async (
  personId: string,
  payload: Pick<Person, "full_name" | "email" | "extra_data" | "active">
): Promise<Person> => {
  const response = await apiClient.patch(`/api/v1/programs/persons/${personId}`, payload);
  return normalizePerson(response.data as Person);
};
