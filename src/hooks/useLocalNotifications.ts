import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions, ActionPerformed } from '@capacitor/local-notifications';
import { useApp } from '@/context/AppContext';
import { safeJSON } from '@/lib/storage';

export interface LocalNotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm" format
  overspendingAlertEnabled: boolean;
}

const DEFAULT_SETTINGS: LocalNotificationSettings = {
  dailyReminderEnabled: false,
  dailyReminderTime: "20:00",
  overspendingAlertEnabled: true,
};

const DAILY_REMINDER_ID = 1001;
const OVERSPENDING_ALERT_ID = 2001;

export const useLocalNotifications = () => {
  const { lang, weekSpend, limits, monthSpentByCategory, transactions } = useApp();
  const isInitialized = useRef(false);

  // Get notification settings from storage
  const getSettings = useCallback((): LocalNotificationSettings => {
    return safeJSON.get("mylo_notification_settings", DEFAULT_SETTINGS) as LocalNotificationSettings;
  }, []);

  // Save notification settings to storage
  const saveSettings = useCallback((settings: LocalNotificationSettings) => {
    safeJSON.set("mylo_notification_settings", settings);
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return false;
    
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (e) {
      console.error('Failed to request notification permissions:', e);
      return false;
    }
  }, []);

  // Schedule daily reminder notification
  const scheduleDailyReminder = useCallback(async (time: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Cancel existing daily reminder
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });

      const [hours, minutes] = time.split(':').map(Number);
      
      const notifications: ScheduleOptions = {
        notifications: [
          {
            id: DAILY_REMINDER_ID,
            title: lang === 'ru' ? '📊 Время проверить финансы' : 
                   lang === 'uz' ? '📊 Moliyangizni tekshirish vaqti' : 
                   '📊 Time to check your finances',
            body: lang === 'ru' ? 'Не забудьте записать сегодняшние расходы в Mylo' :
                  lang === 'uz' ? "Bugungi xarajatlaringizni Mylo'ga yozishni unutmang" :
                  "Don't forget to log today's expenses in Mylo",
            schedule: {
              on: {
                hour: hours,
                minute: minutes,
              },
              repeats: true,
              allowWhileIdle: true,
            },
            smallIcon: 'ic_stat_notification',
            largeIcon: 'ic_launcher',
            sound: 'default',
            channelId: 'daily-reminder',
          },
        ],
      };

      await LocalNotifications.schedule(notifications);
      console.log('Daily reminder scheduled for', time);
    } catch (e) {
      console.error('Failed to schedule daily reminder:', e);
    }
  }, [lang]);

  // Cancel daily reminder
  const cancelDailyReminder = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
      console.log('Daily reminder cancelled');
    } catch (e) {
      console.error('Failed to cancel daily reminder:', e);
    }
  }, []);

  // Check for overspending and trigger alert
  const checkOverspendingAlert = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    const settings = getSettings();
    if (!settings.overspendingAlertEnabled) return;

    try {
      // Calculate weekly budget from limits
      const totalMonthlyBudget = limits.reduce((sum, limit) => sum + limit.amount, 0);
      const weeklyBudget = totalMonthlyBudget / 4;

      if (weeklyBudget <= 0) return;

      // Get current day of week (0 = Sunday, 1 = Monday, etc.)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysElapsed = dayOfWeek === 0 ? 7 : dayOfWeek; // Days since Monday
      
      // Calculate expected spending at this point in the week
      const expectedSpending = (weeklyBudget / 7) * daysElapsed;
      
      // Check if user is trending above their weekly budget
      const overspendingRatio = weekSpend / expectedSpending;
      
      if (overspendingRatio > 1.2 && weekSpend > 0) { // 20% over the expected rate
        const projectedWeeklySpend = (weekSpend / daysElapsed) * 7;
        const overage = Math.round(((projectedWeeklySpend / weeklyBudget) - 1) * 100);

        if (overage > 0) {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: OVERSPENDING_ALERT_ID + Date.now() % 1000, // Unique ID for each alert
                title: lang === 'ru' ? '⚠️ Предупреждение о перерасходе' :
                       lang === 'uz' ? '⚠️ Ortiqcha xarajat haqida ogohlantirish' :
                       '⚠️ Overspending Alert',
                body: lang === 'ru' 
                  ? `Вы на пути к превышению недельного бюджета на ${overage}%. Попробуйте сократить расходы.`
                  : lang === 'uz'
                  ? `Siz haftalik byudjetdan ${overage}% oshib ketish yo'lidasiz. Xarajatlarni kamaytiring.`
                  : `You're on track to exceed your weekly budget by ${overage}%. Try to cut back on spending.`,
                smallIcon: 'ic_stat_notification',
                largeIcon: 'ic_launcher',
                sound: 'default',
                channelId: 'overspending-alert',
              },
            ],
          });
          console.log('Overspending alert triggered:', overage + '% over budget');
        }
      }
    } catch (e) {
      console.error('Failed to check overspending:', e);
    }
  }, [getSettings, limits, weekSpend, lang]);

  // Enable/disable daily reminder
  const setDailyReminder = useCallback(async (enabled: boolean, time?: string) => {
    const settings = getSettings();
    const newTime = time || settings.dailyReminderTime;
    
    settings.dailyReminderEnabled = enabled;
    settings.dailyReminderTime = newTime;
    saveSettings(settings);

    if (enabled) {
      const hasPermission = await requestPermissions();
      if (hasPermission) {
        await scheduleDailyReminder(newTime);
      }
    } else {
      await cancelDailyReminder();
    }
  }, [getSettings, saveSettings, requestPermissions, scheduleDailyReminder, cancelDailyReminder]);

  // Enable/disable overspending alerts
  const setOverspendingAlert = useCallback((enabled: boolean) => {
    const settings = getSettings();
    settings.overspendingAlertEnabled = enabled;
    saveSettings(settings);
  }, [getSettings, saveSettings]);

  // Initialize notifications on app start
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Create notification channels for Android
        await LocalNotifications.createChannel({
          id: 'daily-reminder',
          name: 'Daily Reminders',
          description: 'Daily reminders to log expenses',
          importance: 4, // High
          sound: 'default',
          vibration: true,
        });

        await LocalNotifications.createChannel({
          id: 'overspending-alert',
          name: 'Overspending Alerts',
          description: 'Alerts when spending is above budget',
          importance: 5, // Max
          sound: 'default',
          vibration: true,
        });

        // Check if daily reminder should be enabled
        const settings = getSettings();
        if (settings.dailyReminderEnabled) {
          const hasPermission = await requestPermissions();
          if (hasPermission) {
            await scheduleDailyReminder(settings.dailyReminderTime);
          }
        }

        // Listen for notification actions
        LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('Local notification action performed:', action);
          // Could navigate to specific screen based on notification
        });

      } catch (e) {
        console.error('Failed to initialize local notifications:', e);
      }
    };

    init();
  }, [getSettings, requestPermissions, scheduleDailyReminder]);

  // Check for overspending periodically (when transactions change)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    // Debounce the check to avoid too many notifications
    const lastCheck = safeJSON.get("mylo_last_overspending_check", 0) as number;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - lastCheck > oneHour) {
      checkOverspendingAlert();
      safeJSON.set("mylo_last_overspending_check", now);
    }
  }, [transactions.length, checkOverspendingAlert]);

  return {
    getSettings,
    setDailyReminder,
    setOverspendingAlert,
    requestPermissions,
    checkOverspendingAlert,
  };
};
