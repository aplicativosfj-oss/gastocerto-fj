import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PeriodState {
  year: number;
  month: number;
  setPeriod: (period: { year: number; month: number }) => void;
}

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      setPeriod: (period: { year: number; month: number }) => set(period),
    }),
    {
      name: 'gastocerto-period',
    }
  )
);

