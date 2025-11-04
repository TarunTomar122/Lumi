import { DateTime } from 'luxon';
import { scheduleNotification, checkNotificationPermission, sendInstantNotification } from './tools';
import notifee from '@notifee/react-native';
import { clientTools } from './tools';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REFLECTION_REMINDER_ID = 'daily_reflection_reminder';
const REFLECTION_REMINDER_TIME = { hour: 21, minute: 0 }; // 9:00 PM

/**
 * Background service to check and schedule reflection reminders
 * Runs silently without blocking the UI
 */
export class ReflectionReminderService {
  
  /**
   * Main function to check and schedule reflection reminder
   * This is the entry point for the service
   */
  static async checkAndScheduleReminder(): Promise<void> {
    try {
      // Don't block the UI - run in background
      this.runInBackground();
    } catch (error) {
      console.log('📝 Reflection reminder service error (silent):', error);
      // Fail silently to not disrupt user experience
    }
  }

  /**
   * Runs the actual reminder logic in background
   */
  private static async runInBackground(): Promise<void> {
    try {
      // Respect user preference for reflection reminders (default: enabled)
      const remindersEnabled = await AsyncStorage.getItem('reflectionRemindersEnabled');
      const isEnabled = remindersEnabled === null ? true : remindersEnabled === 'true';
      if (!isEnabled) {
        // Ensure no pending reminder remains when disabled
        await this.cancelExistingReminder();
        console.log('📝 Reflection reminders disabled by user - skipping scheduling');
        return;
      }

      // Check if user has notification permissions (required for reminders)
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        console.log('📝 No notification permission - skipping reflection reminder');
        return;
      }

      // Check if today's reflection already exists
      const hasReflectionToday = await this.checkTodaysReflection();
      
      if (hasReflectionToday) {
        console.log('📝 Reflection exists for today - cancelling any pending reminders');
        await this.cancelExistingReminder();
        return;
      }

      // No reflection for today - check if we need to schedule a reminder
      const now = DateTime.now().setZone('Asia/Kolkata');
      const reminderTime = now.set(REFLECTION_REMINDER_TIME);
      
      // If it's already past 9 PM today, schedule for tomorrow
      const targetTime = now.hour >= 21 ? 
        reminderTime.plus({ days: 1 }) : 
        reminderTime;

      // Check if reminder is already scheduled for the target time
      const hasScheduledReminder = await this.hasScheduledReminderForTime(targetTime);
      
      if (!hasScheduledReminder) {
        await this.scheduleReflectionReminder(targetTime);
        console.log('📝 Reflection reminder scheduled for:', targetTime.toFormat('MMM d, h:mm a'));
      }

    } catch (error) {
      console.log('📝 Background reflection check failed silently:', error);
    }
  }

  /**
   * Check if user has written a reflection for today
   */
  private static async checkTodaysReflection(): Promise<boolean> {
    try {
      const result = await clientTools.getAllReflections();
      
      if (!result.success || !result.reflections) {
        return false;
      }

      const today = DateTime.now().setZone('Asia/Kolkata').toISODate();
      
      // Check if any reflection exists for today
      const todaysReflection = result.reflections.find(reflection => {
        const reflectionDate = DateTime.fromISO(reflection.date).toISODate();
        return reflectionDate === today;
      });

      return !!todaysReflection;
    } catch (error) {
      console.log('📝 Error checking today\'s reflection:', error);
      return false; // Assume no reflection if check fails
    }
  }

  /**
   * Schedule a reflection reminder notification
   */
  private static async scheduleReflectionReminder(scheduledTime: DateTime): Promise<void> {
    try {
      // Cancel any existing reflection reminders first
      await this.cancelExistingReminder();

      // Schedule new reminder
      await scheduleNotification(
        '🌙 Reflect',
        'How was your day? Take a moment to reflect.',
        scheduledTime
      );

      console.log('📝 ✅ Reflection reminder scheduled successfully');
    } catch (error) {
      console.log('📝 Error scheduling reflection reminder:', error);
    }
  }

  /**
   * Cancel any existing reflection reminders
   */
  private static async cancelExistingReminder(): Promise<void> {
    try {
      const scheduledNotifications = await notifee.getTriggerNotificationIds();
      
      // Cancel any notification that might be a reflection reminder
      // Since we can't identify them perfectly, we'll use a simple approach
      for (const notificationId of scheduledNotifications) {
        try {
          await notifee.cancelTriggerNotification(notificationId);
        } catch (error) {
          // Ignore individual cancellation errors
        }
      }
    } catch (error) {
      console.log('📝 Error cancelling existing reminders:', error);
    }
  }

  /**
   * Check if there's already a reminder scheduled for the target time
   */
  private static async hasScheduledReminderForTime(targetTime: DateTime): Promise<boolean> {
    try {
      const scheduledNotifications = await notifee.getTriggerNotifications();
      const targetTimestamp = targetTime.toJSDate().getTime();
      
      // Check if any scheduled notification is close to our target time (within 1 hour)
      const oneHour = 60 * 60 * 1000;
      
      return scheduledNotifications.some(notification => {
        if (notification.trigger?.type === 1) { // TimestampTrigger
          const notificationTime = (notification.trigger as any).timestamp;
          return Math.abs(notificationTime - targetTimestamp) < oneHour;
        }
        return false;
      });
    } catch (error) {
      console.log('📝 Error checking scheduled reminders:', error);
      return false;
    }
  }

  /**
   * Public method to manually trigger the reminder check
   * Can be called from app startup or other trigger points
   */
  static async init(): Promise<void> {
    console.log('📝 Initializing reflection reminder service...');
    await this.checkAndScheduleReminder();
  }

  /**
   * Call this when user writes a reflection to cancel pending reminders
   */
  static async onReflectionAdded(): Promise<void> {
    console.log('📝 Reflection added - cancelling reminders');
    await this.cancelExistingReminder();
  }

  /**
   * TEST FUNCTION: Send an instant reflection reminder notification
   * Use this to test if notifications are working properly
   */
  static async testInstantNotification(): Promise<void> {
    try {
      console.log('📝 🧪 Sending test reflection notification...');
      
      // Check if we have permission first
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        console.log('📝 ❌ No notification permission for test');
        return;
      }

      // Send instant notification
      await sendInstantNotification(
        '🌙 Reflect (TEST)',
        'This is a test reflection reminder. How was your day?'
      );
      
      console.log('📝 ✅ Test notification sent successfully!');
    } catch (error) {
      console.log('📝 ❌ Test notification failed:', error);
    }
  }
} 