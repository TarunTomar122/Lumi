import { create } from 'zustand';
import { clientTools } from '@/utils/tools';
import type { Habit } from '@/utils/database';
import { DateTime } from 'luxon';

interface MonthData {
  dates: string[];
  completions: boolean[];
  monthLabel: string;
  year: number;
  month: number;
}

interface HabitState {
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  updateHabitProgress: (id: string, date: string) => Promise<void>;
  addHabit: (title: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  refreshHabits: () => Promise<void>;
  getWeekProgress: (habit: Habit) => boolean[];
  getMonthData: (habit: Habit, year: number, month: number) => MonthData;
  updateHabitColor: (id: string, color: string) => Promise<void>;
}

// Pastel colors for habits
export const PASTEL_COLORS = [
  '#FFB3BA', // pastel red
  '#FFDFBA', // pastel orange
  '#FFFFBA', // pastel yellow
  '#BAFFC9', // pastel green
  '#BAE1FF', // pastel blue
  '#E0BBE4', // pastel purple
  '#CDE7BE', // pastel mint
  '#F1C0E8', // pastel pink-purple
  '#BDE0FE', // pastel sky
  '#FDE2E4', // pastel blush
];

// Get array of ISO date strings for current week (Monday to Sunday)
const getCurrentWeekDates = (): string[] => {
  const now = DateTime.now();
  const monday = now.startOf('week');
  return Array.from({ length: 7 }, (_, i) => 
    monday.plus({ days: i }).toISODate()
  );
};

// Get array of dates for a specific month
const getMonthDates = (year: number, month: number): string[] => {
  const startOfMonth = DateTime.fromObject({ year, month, day: 1 });
  const daysInMonth = startOfMonth.daysInMonth || 31;
  
  return Array.from({ length: daysInMonth }, (_, i) => 
    startOfMonth.plus({ days: i }).toISODate() || ''
  );
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  
  setHabits: (habits) => set({ habits }),
  
  updateHabitProgress: async (id, date) => {
    const result = await clientTools.getAllHabits();
    if (!result.success || !result.habits) return;

    const habit = result.habits.find(h => h.id === Number(id));
    if (!habit) return;

    const newCompletions = { ...habit.completions };
    newCompletions[date] = !newCompletions[date];

    const updateResult = await clientTools.updateHabit({
      id: id,
      completions: newCompletions
    });

    if (updateResult.success) {
      set((state) => ({
        habits: state.habits.map(h =>
          h.id === Number(id)
            ? { ...h, completions: newCompletions }
            : h
        ),
      }));
    }
  },

  updateHabitColor: async (id, color) => {
    const updateResult = await clientTools.updateHabit({
      id,
      color,
    });

    if (updateResult.success) {
      set((state) => ({
        habits: state.habits.map(h =>
          h.id === Number(id)
            ? { ...h, color }
            : h
        ),
      }));
    }
  },

  addHabit: async (title) => {
    const newColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
    const result = await clientTools.addHabit({ title, color: newColor });
    
    if (result.success && result.id) {
      const habit: Habit = {
        id: result.id,
        title,
        completions: {},
        color: newColor,
      };
      set((state) => ({
        habits: [...state.habits, habit],
      }));
    }
  },

  deleteHabit: async (id) => {
    const result = await clientTools.deleteHabit({ id });
    if (result.success) {
      set((state) => ({
        habits: state.habits.filter((habit) => habit.id !== Number(id)),
      }));
    }
  },

  refreshHabits: async () => {
    const result = await clientTools.getAllHabits();
    if (result.success && result.habits) {
      set({ habits: result.habits });
    }
  },

  getWeekProgress: (habit) => {
    const weekDates = getCurrentWeekDates();
    return weekDates.map(date => !!habit.completions[date]);
  },

  getMonthData: (habit, year, month) => {
    const dates = getMonthDates(year, month);
    const completions = dates.map(date => !!habit.completions[date]);
    const monthLabel = DateTime.fromObject({ year, month }).toFormat('MMMM yyyy');

    return {
      dates,
      completions,
      monthLabel,
      year,
      month
    };
  },
})); 