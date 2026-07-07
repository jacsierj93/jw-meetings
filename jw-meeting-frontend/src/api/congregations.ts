import { apiClient } from "./client";
import type { Congregation } from "../types/congregation";

export const fetchCongregations = async (): Promise<Congregation[]> => {
  const response = await apiClient.get("/api/v1/programs/congregations");
  return response.data;
};

export const createCongregation = async (
  payload: Pick<Congregation, "name" | "settings">
): Promise<Congregation> => {
  const response = await apiClient.post("/api/v1/programs/congregations", payload);
  return response.data;
};
