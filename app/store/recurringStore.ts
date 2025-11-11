import { create } from 'zustand';
import { clientTools } from '@/utils/tools';
import type { RecurringReminder } from '@/utils/database';
import { DateTime } from 'luxon';

interface RecurringState {
  reminders: RecurringReminder[];
  error: string | null;
  setReminders: (items: RecurringReminder[]) => void;
  clearError: () => void;
  refreshReminders: () => Promise<void>;
  addRecurring: (data: Omit<RecurringReminder, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateRecurring: (id: number, updates: Partial<Omit<RecurringReminder, 'id'>>) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  skipNext: (id: number) => Promise<void>;
}

export const useRecurringStore = create<RecurringState>(set => ({
  reminders: [],
  error: null,

  setReminders: reminders => set({ reminders }),
  clearError: () => set({ error: null }),

  refreshReminders: async () => {
    const res = await clientTools.getAllRecurringReminders();
    if (res.success && res.reminders) {
      set({ reminders: res.reminders });
    }
  },

  addRecurring: async data => {
    set({ error: null });
    const res = await clientTools.addRecurringReminder(data);
    if (res.success && res.reminder) {
      set(state => ({ reminders: [...state.reminders, res.reminder!] }));
      return { success: true };
    } else {
      const errorMessage = res.error || 'Failed to add recurring reminder';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateRecurring: async (id, updates) => {
    const res = await clientTools.updateRecurringReminder({ id, ...updates });
    if (res.success && res.reminder) {
      set(state => ({
        reminders: state.reminders.map(r => (r.id === id ? (res.reminder as RecurringReminder) : r)),
      }));
    }
  },

  deleteRecurring: async id => {
    const res = await clientTools.deleteRecurringReminder({ id });
    if (res.success) {
      set(state => ({ reminders: state.reminders.filter(r => r.id !== id) }));
    }
  },

  skipNext: async id => {
    // Advance next_occurrence based on rule
    const current = useRecurringStore.getState().reminders.find(r => r.id === id);
    if (!current) return;
    // Compute next from current.next_occurrence
    const nextFrom = DateTime.fromISO(current.next_occurrence).setZone('Asia/Kolkata');
    let next = nextFrom;
    if (current.rule_type === 'weekly') {
      next = next.plus({ weeks: 1 });
    } else if (current.rule_type === 'monthly') {
      next = next.plus({ months: 1 });
    } else {
      next = next.plus({ days: Math.max(1, current.interval || 1) });
    }
    await useRecurringStore.getState().updateRecurring(id, { next_occurrence: next.toISO() || current.next_occurrence });
  },
})); 


