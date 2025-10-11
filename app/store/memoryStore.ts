import { create } from 'zustand';
import { clientTools } from '@/utils/tools';
import type { Memory as DatabaseMemory } from '@/utils/database';

export interface Memory extends Omit<DatabaseMemory, 'id'> {
  id: number;
  type: 'memory';
  images?: string[]; 
}

interface MemoryState {
  memories: Memory[];
  setMemories: (memories: Memory[]) => void;
  addMemory: (memory: Omit<DatabaseMemory, 'id' | 'date'>) => Promise<void>;
  updateMemory: (id: number, updates: Partial<Omit<DatabaseMemory, 'id'>>) => Promise<void>;
  deleteMemory: (id: number) => Promise<void>;
  refreshMemories: () => Promise<void>;
}

export const useMemoryStore = create<MemoryState>(set => ({
  memories: [],

  setMemories: memories => set({ memories }),

  addMemory: async memoryData => {
    const result = await clientTools.addMemory(memoryData);
    if (result.success && result.id) {
      const newMemory = {
        id: result.id,
        ...memoryData,
        date: new Date().toISOString(),
        type: 'memory' as const,
      };
      set(state => ({
        memories: [...state.memories, newMemory],
      }));
    }
  },

  updateMemory: async (id, updates) => {
    const result = await clientTools.updateMemory({ id: id.toString(), ...updates });
    if (result.success) {
      set(state => ({
        memories: state.memories.map(memory =>
          memory.id === id ? { ...memory, ...updates, date: new Date().toISOString() } : memory
        ),
      }));
    }
  },

  deleteMemory: async id => {
    const result = await clientTools.deleteMemory({ id: id.toString() });
    if (result.success) {
      set(state => ({
        memories: state.memories.filter(memory => memory.id !== id),
      }));
    }
  },

  refreshMemories: async () => {
    const result = await clientTools.getAllMemories();
    if (result.success && result.memories) {
      // newest first should be at the top
      const memoriesWithType = result.memories.map(memory => ({
        ...memory,
        id: memory.id!, // We know id exists since it's from the database
        type: 'memory' as const,
      }));
      set({ memories: memoriesWithType });
    }
  },
}));
