import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  card: string;
  
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Borders & Dividers
  border: string;
  divider: string;
  
  // Interactive elements
  primary: string;
  primaryText: string;
  
  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';
  statusBarBackground: string;

  // Error
  error: string;
}

const lightTheme: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  divider: '#F0F0F0',
  primary: '#000000',
  primaryText: '#ffffff',
  statusBarStyle: 'dark-content',
  statusBarBackground: '#f5f5f5',
  error: 'rgba(255, 68, 68, 0.8)',
};

const darkTheme: ThemeColors = {
  background: '#181a20',
  surface: '#2e2e2e',
  card: '#1f222a',
  text: '#f5f5f5',
  textSecondary: '#c0c0c0',
  textTertiary: '#a0a0a0',
  border: '#484848',
  divider: '#3a3a3a',
  primary: '#f5f5f5',
  primaryText: '#1a1a1a',
  statusBarStyle: 'light-content',
  statusBarBackground: '#181a20',
  error: 'rgba(255, 68, 68, 0.8)',
};

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  initializeTheme: () => { remove: () => void } | undefined;
}

const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

const getEffectiveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

const getThemeColors = (effectiveTheme: 'light' | 'dark'): ThemeColors => {
  return effectiveTheme === 'dark' ? darkTheme : lightTheme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      colors: lightTheme,
      isDark: false,
      
      setTheme: (mode: ThemeMode) => {
        const effectiveTheme = getEffectiveTheme(mode);
        const colors = getThemeColors(effectiveTheme);
        const isDark = effectiveTheme === 'dark';
        
        set({ mode, colors, isDark });
      },
      
      initializeTheme: () => {
        const { mode } = get();
        const effectiveTheme = getEffectiveTheme(mode);
        const colors = getThemeColors(effectiveTheme);
        const isDark = effectiveTheme === 'dark';
        
        set({ colors, isDark });
        
        // Listen for system theme changes
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
          const { mode } = get();
          if (mode === 'system') {
            const newEffectiveTheme = colorScheme === 'dark' ? 'dark' : 'light';
            const newColors = getThemeColors(newEffectiveTheme);
            const newIsDark = newEffectiveTheme === 'dark';
            
            set({ colors: newColors, isDark: newIsDark });
          }
        });
        
        return subscription;
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
    }
  )
); 