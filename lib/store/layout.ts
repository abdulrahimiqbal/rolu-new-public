import { create } from 'zustand';

interface LayoutState {
  isGameplayActive: boolean;
  setIsGameplayActive: (isActive: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isGameplayActive: false,
  setIsGameplayActive: (isActive) => set({ isGameplayActive: isActive }),
})); 