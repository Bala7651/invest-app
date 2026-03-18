import { create } from 'zustand';

export type GlowLevel = 'subtle' | 'medium' | 'heavy';

interface SettingsState {
  glowLevel: GlowLevel;
  setGlowLevel: (level: GlowLevel) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  glowLevel: 'subtle',
  setGlowLevel: (level) => set({ glowLevel: level }),
}));
