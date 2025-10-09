import { create } from 'zustand';
import { clientTools } from '@/utils/tools';
import type { Task } from '@/utils/database';

interface TaskWithType extends Task {
  type: 'task';
}

interface TaskState {
  tasks: TaskWithType[];
  error: string | null;
  setTasks: (tasks: TaskWithType[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateTask: (id: number, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  refreshTasks: () => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>(set => ({
  tasks: [],
  error: null,

  setTasks: tasks => set({ tasks }),
  
  clearError: () => set({ error: null }),

  addTask: async taskData => {
    set({ error: null }); // Clear any previous errors
    const result = await clientTools.addTask(taskData);
    if (result.success && result.task) {
      set(state => ({
        tasks: [...state.tasks, { ...result.task, type: 'task' } as TaskWithType],
      }));
      return { success: true };
    } else {
      const errorMessage = result.error || 'Failed to add task';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateTask: async (id, updates) => {
    const result = await clientTools.updateTask({ id, ...updates });
    if (result.success && result.task) {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === id ? ({ ...result.task, type: 'task' } as TaskWithType) : task
        ),
      }));
    }
  },

  deleteTask: async id => {
    const result = await clientTools.deleteTask({ id });
    if (result.success) {
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== id),
      }));
    }
  },

  refreshTasks: async () => {
    console.log('refreshing tasks');
    const result = await clientTools.getAllTasks();
    // sort the tasks by due date (earliest first), then by creation date
    const sortedTasks = result.tasks?.sort((a, b) => {
      // Get the relevant date for each task (due_date or reminder_date)
      const aDate = a.due_date || a.reminder_date;
      const bDate = b.due_date || b.reminder_date;
      
      // If both have dates, sort by date (earliest first)
      if (aDate && bDate) {
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      }
      
      // If only one has a date, prioritize the one with a date
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      
      // If neither has a date, sort by creation date (newest first)
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
    if (result.success && sortedTasks) {
      const tasksWithType = sortedTasks.map(task => ({
        ...task,
        type: 'task' as const,
      })) as TaskWithType[];
      set({ tasks: tasksWithType });
    }
  },
}));
