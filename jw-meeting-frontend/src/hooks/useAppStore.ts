import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  activeCongregationId: string | null;
  activeProgramId: string | null;
  activeCongregationName: string | null;
  setActiveCongregationId: (id: string | null) => void;
  setActiveProgramId: (id: string | null) => void;
  setActiveCongregationName: (name: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeCongregationId: null,
      activeProgramId: null,
      activeCongregationName: null,
      setActiveCongregationId: (id) => set({ activeCongregationId: id }),
      setActiveCongregationName: (name) => set({ activeCongregationName: name }),
      setActiveProgramId: (id) => set({ activeProgramId: id }),
    }),
    {
      name: "jw-meeting-app",
    }
  )
);
