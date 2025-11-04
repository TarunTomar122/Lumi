import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  username: string;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  reflectionRemindersEnabled: boolean;
  setUsername: (username: string) => void;
  updateUsername: (username: string) => Promise<void>;
  setOnboardingComplete: (username: string) => Promise<void>;
  initializeUser: () => Promise<void>;
  setReflectionRemindersEnabled: (enabled: boolean) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  username: '',
  hasCompletedOnboarding: false,
  isLoading: true,
  reflectionRemindersEnabled: true,

  setUsername: (username: string) => {
    set({ username });
  },

  updateUsername: async (username: string) => {
    try {
      await AsyncStorage.setItem('username', username);
      set({ username });
    } catch (error) {
      console.error('Error updating username:', error);
      throw error;
    }
  },

  setOnboardingComplete: async (username: string) => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('username', username);
      set({ 
        username, 
        hasCompletedOnboarding: true 
      });
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  },

  initializeUser: async () => {
    try {
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      const storedUsername = await AsyncStorage.getItem('username');
      const remindersEnabled = await AsyncStorage.getItem('reflectionRemindersEnabled');
      
      set({
        hasCompletedOnboarding: hasCompletedOnboarding === 'true',
        username: storedUsername || '',
        isLoading: false,
        reflectionRemindersEnabled: remindersEnabled === null ? true : remindersEnabled === 'true',
      });
    } catch (error) {
      console.error('Error initializing user:', error);
      set({ isLoading: false });
    }
  },

  setReflectionRemindersEnabled: async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('reflectionRemindersEnabled', enabled ? 'true' : 'false');
      set({ reflectionRemindersEnabled: enabled });
    } catch (error) {
      console.error('Error updating reflection reminders setting:', error);
      throw error;
    }
  },
})); 