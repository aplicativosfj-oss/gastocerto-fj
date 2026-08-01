import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PeriodState {
  year: number;
  month: number;
  typeFilter: "all" | "income" | "expense" | "recurring";
  setPeriod: (period: { year: number; month: number }) => void;
  setTypeFilter: (type: "all" | "income" | "expense" | "recurring") => void;
  reset: () => void;
}

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      typeFilter: "all",
      setPeriod: (period) => set(period),
      setTypeFilter: (type) => set({ typeFilter: type }),
      reset: () => {
        const today = new Date();
        set({
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          typeFilter: "all",
        });
      },
    }),
    {
      name: "gastocerto-period",
    }
  )
);
