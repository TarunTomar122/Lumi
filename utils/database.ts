import SQLite from 'react-native-sqlite-storage';
import * as FileSystem from 'expo-file-system';

// Enable debugging in development
SQLite.DEBUG(true);
// Use the new WebSQL API
SQLite.enablePromise(true);

export interface Task {
  id?: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  reminder_date?: string | null; // Will store full datetime string
  status: 'todo' | 'done';
  created_at: string;
  completed_at?: string | null; // Track when task was completed
}

export interface Memory {
  id?: number;
  title: string;
  content: string;
  date: string;
  tags: string[];
  images?: string[];
  created_at: string;
}

export interface Habit {
  id?: number;
  title: string;
  completions: Record<string, boolean>; // Map of ISO date strings to completion status
  color: string;
  created_at: string;
}

export interface Reflection {
  id?: number;
  date: string;
  content: string;
  created_at: string;
}

class DatabaseManager {
  private database: SQLite.SQLiteDatabase | null = null;
  private static instance: DatabaseManager;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private async waitForInit(): Promise<void> {
    if (this.database) return;
    if (this.isInitializing) {
      await this.initPromise;
      return;
    }
    await this.init();
  }

  async init(): Promise<void> {
    if (this.database) return;
    if (this.isInitializing) {
      await this.initPromise;
      return;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const db = await SQLite.openDatabase({
          name: 'lumiDB.db',
          location: 'default',
        });
        this.database = db;
        await this.createTables();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    await this.initPromise;
  }

  private async createTables(): Promise<void> {
    if (!this.database) {
      console.error('Database not initialized');
      return;
    }
    try {
      // Create tasks table if it doesn't exist
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          due_date TEXT,
          reminder_date TEXT,
          status TEXT NOT NULL DEFAULT 'todo',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        )
      `);

      // Add completed_at column if it doesn't exist (for existing databases)
      try {
        await this.database.executeSql(`
          ALTER TABLE tasks ADD COLUMN completed_at TEXT
        `);
      } catch (error) {
        // Column already exists, ignore error
      }

      // Create memories table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          date TEXT NOT NULL,
          tags TEXT NOT NULL,
          images TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      try {
        await this.database.executeSql(`
           ALTER TABLE memories ADD COLUMN images TEXT;
        `);
      } catch (error) {
      }

      // Drop and recreate habits table with new schema
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          completions TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      // Create reflections table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS reflections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error in createTables:', error);
      throw error;
    }
  }

  // Tasks CRUD operations
  async getAllTasks(): Promise<Task[]> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM tasks ORDER BY COALESCE(due_date, reminder_date, datetime("now")) ASC;'
      );
      const tasks: Task[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        tasks.push(results.rows.item(i));
      }
      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  async addTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [result] = await this.database.executeSql(
        `INSERT INTO tasks (title, description, due_date, reminder_date, status)
         VALUES (?, ?, ?, ?, ?);`,
        [
          task.title,
          task.description || null,
          task.due_date || null,
          task.reminder_date || null,
          task.status || 'todo',
        ]
      );

      // Fetch the created task to get the created_at timestamp
      const [createdTask] = await this.database.executeSql(
        'SELECT * FROM tasks WHERE id = ?;',
        [result.insertId]
      );

      return createdTask.rows.item(0);
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Omit<Task, 'id'>>): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    // If marking as done, set completed_at timestamp
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString();
    }
    // If marking as todo, clear completed_at timestamp
    else if (updates.status === 'todo') {
      updates.completed_at = null;
    }

    const updateFields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    try {
      await this.database.executeSql(`UPDATE tasks SET ${updateFields} WHERE id = ?;`, [
        ...values,
        id,
      ]);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      await this.database.executeSql('DELETE FROM tasks WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async getTaskHistory(days: number = 30): Promise<Task[]> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        `SELECT * FROM tasks 
         WHERE completed_at IS NOT NULL 
         AND datetime(completed_at) >= datetime('now', '-${days} days')
         ORDER BY completed_at DESC;`
      );
      const tasks: Task[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        tasks.push(results.rows.item(i));
      }
      return tasks;
    } catch (error) {
      console.error('Error getting task history:', error);
      throw error;
    }
  }

  // Memories CRUD operations
  async getAllMemories(): Promise<Memory[]> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM memories ORDER BY date DESC;'
      );
      const memories: Memory[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const item = results.rows.item(i);
        memories.push({
          ...item,
          tags: JSON.parse(item.tags),
          images: item.images ? JSON.parse(item.images) : [],
        });
      }
      return memories;
    } catch (error) {
      console.error('Error getting memories:', error);
      throw error;
    }
  }

  async addMemory(memory: Omit<Memory, 'id' | 'created_at'>): Promise<Memory> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [result] = await this.database.executeSql(
        `INSERT INTO memories (title, content, date, tags, images)
         VALUES (?, ?, ?, ?, ?);`,
        [
          memory.title,
          memory.content,
          memory.date,
          JSON.stringify(memory.tags),
          JSON.stringify(memory.images || []),
        ]
      );

      // Fetch the created memory to get the created_at timestamp
      const [createdMemory] = await this.database.executeSql(
        'SELECT * FROM memories WHERE id = ?;',
        [result.insertId]
      );
      const item = createdMemory.rows.item(0);
      return {
        ...item,
        tags: JSON.parse(item.tags),
        images: item.images ? JSON.parse(item.images) : [],
      };
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  async updateMemory(id: number, updates: Partial<Omit<Memory, 'id'>>): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    const updateFields = Object.keys(updates)
      .map(key => {
        if (key === 'tags' || key === 'images') {
          return `${key} = ?`;
        }
        return `${key} = ?`;
      })
      .join(', ');
    const values = Object.entries(updates).map(([key, value]) => {
      if (key === 'tags') {
        return JSON.stringify(value);
      }
      return value;
    });

    try {
      await this.database.executeSql(`UPDATE memories SET ${updateFields} WHERE id = ?;`, [
        ...values,
        id,
      ]);
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  }

  async deleteMemory(id: number): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [rowRes] = await this.database.executeSql('SELECT * FROM memories WHERE id = ?;', [id]);
      if (rowRes.rows.length === 0) {
        throw new Error('Memory not found');
      }
      const memory = rowRes.rows.item(0);
         for (const uri of JSON.parse(memory.images || '[]')) {
        try {
          if (uri && uri.startsWith(FileSystem.documentDirectory)) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        } catch (e) {
        }
      }
      await this.database.executeSql('DELETE FROM memories WHERE id = ?;', [id]);
      await this.database.executeSql('DELETE FROM memories WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  // Habits CRUD operations
  async getAllHabits(): Promise<Habit[]> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM habits ORDER BY id ASC;'
      );
      const habits: Habit[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const item = results.rows.item(i);
        habits.push({
          ...item,
          completions: JSON.parse(item.completions),
        });
      }
      return habits;
    } catch (error) {
      console.error('Error getting habits:', error);
      throw error;
    }
  }

  async addHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<Habit> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [result] = await this.database.executeSql(
        `INSERT INTO habits (title, completions, color)
         VALUES (?, ?, ?);`,
        [
          habit.title,
          JSON.stringify(habit.completions),
          habit.color,
        ]
      );

      // Fetch the created habit to get the created_at timestamp
      const [createdHabit] = await this.database.executeSql(
        'SELECT * FROM habits WHERE id = ?;',
        [result.insertId]
      );
      const item = createdHabit.rows.item(0);
      return {
        ...item,
        completions: JSON.parse(item.completions),
      };
    } catch (error) {
      console.error('Error adding habit:', error);
      throw error;
    }
  }

  async updateHabit(id: number, updates: Partial<Omit<Habit, 'id'>>): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    const updateFields = Object.keys(updates)
      .map(key => {
        if (key === 'completions') {
          return `${key} = ?`;
        }
        return `${key} = ?`;
      })
      .join(', ');
    const values = Object.entries(updates).map(([key, value]) => 
      key === 'completions' ? JSON.stringify(value) : value
    );

    try {
      await this.database.executeSql(`UPDATE habits SET ${updateFields} WHERE id = ?;`, [
        ...values,
        id,
      ]);
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  }

  async deleteHabit(id: number): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      await this.database.executeSql('DELETE FROM habits WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  }

  // Reflections CRUD operations
  async getAllReflections(): Promise<Reflection[]> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM reflections ORDER BY date DESC;'
      );
      const reflections: Reflection[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        reflections.push(results.rows.item(i));
      }
      return reflections;
    } catch (error) {
      console.error('Error getting reflections:', error);
      throw error;
    }
  }

  async addReflection(reflection: Omit<Reflection, 'id' | 'created_at'>): Promise<Reflection> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [result] = await this.database.executeSql(
        `INSERT INTO reflections (date, content)
         VALUES (?, ?);`,
        [reflection.date, reflection.content]
      );

      // Fetch the created reflection to get the created_at timestamp
      const [createdReflection] = await this.database.executeSql(
        'SELECT * FROM reflections WHERE id = ?;',
        [result.insertId]
      );
      return createdReflection.rows.item(0);
    } catch (error) {
      console.error('Error adding reflection:', error);
      throw error;
    }
  }

  async updateReflection(id: number, updates: Partial<Omit<Reflection, 'id'>>): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    const updateFields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    try {
      await this.database.executeSql(
        `UPDATE reflections SET ${updateFields} WHERE id = ?;`,
        [...values, id]
      );
    } catch (error) {
      console.error('Error updating reflection:', error);
      throw error;
    }
  }

  async deleteReflection(id: number): Promise<void> {
    await this.waitForInit();
    if (!this.database) throw new Error('Database not initialized');

    try {
      await this.database.executeSql('DELETE FROM reflections WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error deleting reflection:', error);
      throw error;
    }
  }
}

export const db = DatabaseManager.getInstance();
