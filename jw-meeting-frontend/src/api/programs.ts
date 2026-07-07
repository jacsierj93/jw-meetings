import { apiClient } from "./client";
import type { Program, Week } from "../types/program";

export const fetchPrograms = async (congregationId: string): Promise<Program[]> => {
  const response = await apiClient.get("/api/v1/programs", {
    params: { congregation_id: congregationId },
  });
  return response.data;
};

export const fetchProgram = async (programId: string): Promise<Program> => {
  const response = await apiClient.get(`/api/v1/programs/${programId}`);
  return response.data;
};

export const fetchWeeks = async (programId: string): Promise<Week[]> => {
  const response = await apiClient.get(`/api/v1/programs/${programId}/weeks`);
  return response.data;
};

export const importProgram = async (payload: FormData): Promise<Program> => {
  const response = await apiClient.post("/api/v1/programs/import", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteProgram = async (programId: string): Promise<Program> => {
  const response = await apiClient.delete(`/api/v1/programs/${programId}`);
  return response.data;
};

export const deleteWeek = async (weekId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/programs/weeks/${weekId}`);
};

export const updateWeek = async (
  weekId: string,
  payload: { extra_data: Record<string, unknown> }
): Promise<Week> => {
  const response = await apiClient.patch(`/api/v1/programs/weeks/${weekId}`, payload);
  return response.data;
};
