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
  archivedHabits: Habit[];
  setHabits: (habits: Habit[]) => void;
  updateHabitProgress: (id: string, date: string) => Promise<void>;
  addHabit: (title: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  refreshHabits: () => Promise<void>;
  getWeekProgress: (habit: Habit) => boolean[];
  getMonthData: (habit: Habit, year: number, month: number) => MonthData;
  updateHabitColor: (id: string, color: string) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  unarchiveHabit: (id: string) => Promise<void>;
  reorderHabits: (habits: Habit[]) => Promise<void>;
  refreshArchivedHabits: () => Promise<void>;
}

// Pastel colors for habits - distinct and visually different
export const PASTEL_COLORS = [
  '#FF6B6B', // coral red
  '#FFB84D', // bright orange
  '#F7DC6F', // golden yellow
  '#52C41A', // vibrant green
  '#1890FF', // bright blue
  '#B37FEB', // purple
  '#FF85C0', // pink
  '#36CFC9', // cyan
  '#FA8C16', // dark orange
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
  archivedHabits: [],
  
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

  archiveHabit: async (id) => {
    const updateResult = await clientTools.updateHabit({
      id,
      archived: true,
    });

    if (updateResult.success) {
      set((state) => ({
        habits: state.habits.filter(h => h.id !== Number(id)),
      }));
    }
  },

  unarchiveHabit: async (id) => {
    const updateResult = await clientTools.updateHabit({
      id,
      archived: false,
    });

    if (updateResult.success) {
      await get().refreshHabits();
      await get().refreshArchivedHabits();
    }
  },

  reorderHabits: async (habits) => {
    // Update positions in the database
    for (let i = 0; i < habits.length; i++) {
      if (habits[i].id) {
        await clientTools.updateHabit({
          id: habits[i].id.toString(),
          position: i,
        });
      }
    }
    
    // Refresh to get updated order
    await get().refreshHabits();
  },

  refreshArchivedHabits: async () => {
    const result = await clientTools.getArchivedHabits();
    if (result.success && result.habits) {
      set({ archivedHabits: result.habits });
    }
  },
})); 