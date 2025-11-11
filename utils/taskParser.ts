import { DateTime } from 'luxon';
import * as chrono from 'chrono-node';
import type { RecurringReminder } from './database';

export interface ParsedTaskData {
  title: string;
  due_date?: string;
  reminder_date?: string;
  status: 'todo';
  created_at: string;
}

export type ParsedRecurringData = Omit<RecurringReminder, 'id' | 'created_at'>;

export function parseTaskInput(userInput: string): ParsedTaskData {
  const now = DateTime.now().setZone('Asia/Kolkata');
  
  // Use chrono to parse natural language dates/times
  const parseResults = chrono.parse(userInput, now.toJSDate(), {
    forwardDate: true // Always assume future dates
  });

  let taskData: ParsedTaskData = {
    title: userInput.trim(), // Default title is the full input
    status: 'todo',
    created_at: new Date().toISOString(),
  };

  if (parseResults.length > 0) {
    const result = parseResults[0];
    
    // Extract the task title by removing the parsed date/time text
    const beforeDateText = userInput.substring(0, result.index).trim();
    const afterDateText = userInput.substring(result.index + result.text.length).trim();
    
    // Combine the parts, removing common connecting words
    let title = (beforeDateText + ' ' + afterDateText).trim();
    title = title.replace(/\s+/g, ' '); // Clean up multiple spaces
    title = title.replace(/^(at|on|by|for)\s+/i, ''); // Remove leading prepositions
    title = title.replace(/\s+(at|on|by|for)$/i, ''); // Remove trailing prepositions
    
    if (title) {
      taskData.title = title;
    }

    // Get the parsed date
    const parsedDate = result.start.date();
    const luxonDate = DateTime.fromJSDate(parsedDate).setZone('Asia/Kolkata');
    
    const isoDate = luxonDate.toISO();
    if (isoDate) {
      taskData.due_date = isoDate;
      taskData.reminder_date = isoDate;
    }
  } else {
    // No date/time found - use smart default logic
    // If it's before 9pm, schedule for today at 9pm
    // If it's 9pm or later, schedule for tomorrow at 9pm
    let targetDateTime = now.set({
      hour: 21, // 9pm in 24-hour format
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    // If it's already past 9pm today, schedule for tomorrow at 9pm
    if (now.hour >= 21) {
      targetDateTime = targetDateTime.plus({ days: 1 });
    }

    const isoDate = targetDateTime.toISO();
    if (isoDate) {
      taskData.due_date = isoDate;
      taskData.reminder_date = isoDate;
    }
  }

  return taskData;
} 

/**
 * Parses user input for recurring reminder patterns like:
 * - "every monday at 7pm call mom"
 * - "clean house every week"
 * - "pay bills every month on the 5th at 9am"
 * - "water plants every 3 days"
 *
 * Returns null if no recurrence detected.
 */
export function parseRecurringInput(userInput: string): ParsedRecurringData | null {
  const now = DateTime.now().setZone('Asia/Kolkata');
  const lower = userInput.toLowerCase();
  if (!lower.includes('every')) return null;

  // Try to extract time using chrono
  const timeResult = chrono.parse(userInput, now.toJSDate(), { forwardDate: true })[0];
  let title = userInput.trim();
  let hour = 9;
  let minute = 0;
  let anchorDate: DateTime | null = null;

  if (timeResult) {
    const parsedDate = timeResult.start.date();
    const lux = DateTime.fromJSDate(parsedDate).setZone('Asia/Kolkata');
    // Prefer keeping the time if present
    hour = lux.hour || hour;
    minute = lux.minute || minute;
    anchorDate = lux;

    // Remove parsed time phrase from title
    const before = userInput.substring(0, timeResult.index).trim();
    const after = userInput.substring(timeResult.index + timeResult.text.length).trim();
    title = (before + ' ' + after).replace(/\s+/g, ' ').trim();
  }

  // Remove joining words like "every", "on", "at" from edges
  title = title.replace(/\b(every|on|at)\b/gi, ' ').replace(/\s+/g, ' ').trim();

  // Detect every N days
  const everyNDays = lower.match(/every\s+(\d+)\s*day(s)?/i);
  if (everyNDays) {
    const interval = Math.max(1, parseInt(everyNDays[1], 10));
    const start = (anchorDate || now).set({ hour, minute, second: 0, millisecond: 0 });
    const next = start <= now ? start.plus({ days: interval }) : start;
    return {
      title,
      description: null,
      rule_type: 'every_n_days',
      interval,
      day_of_week: null,
      day_of_month: null,
      time_hour: hour,
      time_minute: minute,
      next_occurrence: next.toISO() || now.toISO(),
      active: true,
    };
  }

  // Detect weekly phrases: "every week", "every monday", "every mon"
  const weekdayMap: Record<string, number> = {
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
    sunday: 7, sun: 7,
  };
  const weekdayMatch = lower.match(/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun)\b/);
  const isWeeklyGeneric = /\bevery\s+week\b/.test(lower) || !!weekdayMatch;
  if (isWeeklyGeneric) {
    let dayOfWeek: number | null = null;
    if (weekdayMatch) {
      dayOfWeek = weekdayMap[weekdayMatch[1]];
    } else if (anchorDate) {
      dayOfWeek = anchorDate.weekday;
    } else {
      dayOfWeek = now.weekday;
    }
    // Default weekly time: 9am if not provided
    const start = (anchorDate || now).set({ hour: hour || 9, minute: minute || 0, second: 0, millisecond: 0 });
    // Compute next occurrence on/after now at specified weekday/time
    let next = start;
    // Move to target weekday
    const delta = (dayOfWeek + 7 - next.weekday) % 7;
    next = next.plus({ days: delta === 0 && next <= now ? 7 : delta });
    return {
      title,
      description: null,
      rule_type: 'weekly',
      interval: null,
      day_of_week: dayOfWeek,
      day_of_month: null,
      time_hour: start.hour,
      time_minute: start.minute,
      next_occurrence: next.toISO() || now.toISO(),
      active: true,
    };
  }

  // Detect monthly: "every month" optionally "on the 15th" / "on 15"
  const monthDayMatch = lower.match(/\bon\s+(the\s+)?(\d{1,2})(st|nd|rd|th)?\b/);
  const isMonthly = /\bevery\s+month\b/.test(lower);
  if (isMonthly) {
    const dom = monthDayMatch ? Math.min(28, Math.max(1, parseInt(monthDayMatch[2], 10))) : now.day;
    const start = (anchorDate || now).set({ hour: hour || 9, minute: minute || 0, second: 0, millisecond: 0 });
    let next = start;
    // If today has already passed this month's time/day, go to next month
    if (now.day > dom || (now.day === dom && start <= now)) {
      next = next.plus({ months: 1 });
    }
    next = next.set({ day: dom });
    if (!next.isValid) {
      next = next.endOf('month').set({ hour: start.hour, minute: start.minute, second: 0, millisecond: 0 });
    }
    return {
      title,
      description: null,
      rule_type: 'monthly',
      interval: null,
      day_of_week: null,
      day_of_month: dom,
      time_hour: start.hour,
      time_minute: start.minute,
      next_occurrence: next.toISO() || now.toISO(),
      active: true,
    };
  }

  return null;
}