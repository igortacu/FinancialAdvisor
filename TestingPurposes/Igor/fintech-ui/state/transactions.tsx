import { create } from "zustand";

export type Transaction = {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string;
  meta?: any;
};

type Store = {
  list: Transaction[];
  add: (t: Transaction) => void;
  clear: () => void;
};

export const useTransactions = create<Store>((set) => ({
  list: [],
  add: (t) => set((s) => ({ list: [t, ...s.list] })),
  clear: () => set({ list: [] }),
}));
