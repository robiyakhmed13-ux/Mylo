import React, { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Vibrate, Bell, Clock, AlertTriangle, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { safeJSON } from "@/lib/storage";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { useHaptic } from "@/hooks/useHaptic";

type HapticIntensity = "off" | "light" | "medium";
import { Switch } from "@/components/ui/switch";
import { Capacitor } from '@capacitor/core';

interface HapticSettingsScreenProps {
  onBack: () => void;
}

const HAPTIC_OPTIONS = [
  { key: "off" as const, label: { en: "Off", ru: "Выкл", uz: "O'chiq" } },
  { key: "light" as const, label: { en: "Light", ru: "Легкая", uz: "Yengil" } },
  { key: "medium" as const, label: { en: "Medium", ru: "Средняя", uz: "O'rtacha" } },
];

const TIME_OPTIONS = [
  { key: "08:00", label: { en: "8:00 AM", ru: "8:00", uz: "8:00" } },
  { key: "12:00", label: { en: "12:00 PM", ru: "12:00", uz: "12:00" } },
  { key: "18:00", label: { en: "6:00 PM", ru: "18:00", uz: "18:00" } },
  { key: "20:00", label: { en: "8:00 PM", ru: "20:00", uz: "20:00" } },
  { key: "21:00", label: { en: "9:00 PM", ru: "21:00", uz: "21:00" } },
];

const TRANSLATIONS = {
  title: { en: "Haptics & Notifications", ru: "Вибрация и уведомления", uz: "Tebranish va bildirishnomalar" },
  hapticFeedback: { en: "Haptic Feedback", ru: "Тактильная отдача", uz: "Taktil qaytarish" },
  hapticDesc: { en: "Vibration when tapping buttons", ru: "Вибрация при нажатии кнопок", uz: "Tugmalarni bosganda tebranish" },
  notifications: { en: "Notifications", ru: "Уведомления", uz: "Bildirishnomalar" },
  dailyReminder: { en: "Daily Reminder", ru: "Ежедневное напоминание", uz: "Kunlik eslatma" },
  dailyReminderDesc: { en: "Remind me to log expenses", ru: "Напомнить записать расходы", uz: "Xarajatlarni yozishni eslatish" },
  reminderTime: { en: "Reminder Time", ru: "Время напоминания", uz: "Eslatma vaqti" },
  overspendingAlert: { en: "Overspending Alert", ru: "Предупреждение о перерасходе", uz: "Ortiqcha xarajat ogohlantirishlari" },
  overspendingDesc: { en: "Alert when trending above weekly budget", ru: "Оповещение при превышении бюджета", uz: "Haftalik byudjetdan oshganda ogohlantirish" },
  nativeOnly: { en: "Available in native app", ru: "Доступно в приложении", uz: "Ilovada mavjud" },
};

export const HapticSettingsScreen: React.FC<HapticSettingsScreenProps> = memo(({ onBack }) => {
  const { lang } = useApp();
  const { triggerLight } = useHaptic();
  const { getSettings, setDailyReminder, setOverspendingAlert } = useLocalNotifications();
  
  const [hapticIntensity, setHapticIntensityState] = useState<HapticIntensity>(() => 
    safeJSON.get("mylo_haptic_intensity", "light") as HapticIntensity
  );
  
  const [dailyReminderEnabled, setDailyReminderEnabledState] = useState(false);
  const [reminderTime, setReminderTimeState] = useState("20:00");
  const [overspendingEnabled, setOverspendingEnabledState] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Load settings on mount
  useEffect(() => {
    const settings = getSettings();
    setDailyReminderEnabledState(settings.dailyReminderEnabled);
    setReminderTimeState(settings.dailyReminderTime);
    setOverspendingEnabledState(settings.overspendingAlertEnabled);
  }, [getSettings]);

  const handleHapticChange = (intensity: HapticIntensity) => {
    triggerLight();
    setHapticIntensityState(intensity);
    safeJSON.set("mylo_haptic_intensity", intensity);
  };

  const handleDailyReminderToggle = async (enabled: boolean) => {
    triggerLight();
    setDailyReminderEnabledState(enabled);
    await setDailyReminder(enabled, reminderTime);
  };

  const handleReminderTimeChange = async (time: string) => {
    triggerLight();
    setReminderTimeState(time);
    setShowTimePicker(false);
    if (dailyReminderEnabled) {
      await setDailyReminder(true, time);
    }
  };

  const handleOverspendingToggle = (enabled: boolean) => {
    triggerLight();
    setOverspendingEnabledState(enabled);
    setOverspendingAlert(enabled);
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][lang];

  return (
    <div className="screen-container overflow-y-auto">
      {/* Header */}
      <div className="screen-header sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:opacity-80 transition-opacity shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-large-title text-foreground">{t("title")}</h1>
        </div>
      </div>

      <div className="space-y-6 pb-24">
        {/* Haptic Feedback Section */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Vibrate className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-body-medium text-foreground">{t("hapticFeedback")}</h3>
              <p className="text-caption">{t("hapticDesc")}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {HAPTIC_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleHapticChange(option.key)}
                className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                  hapticIntensity === option.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <span className="text-sm font-medium">{option.label[lang]}</span>
                {hapticIntensity === option.key && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="card-elevated overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-body-medium text-foreground">{t("notifications")}</h3>
            </div>
            {!isNative && (
              <p className="text-caption mt-2 text-amber-600">{t("nativeOnly")}</p>
            )}
          </div>

          {/* Daily Reminder */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-body-medium text-foreground">{t("dailyReminder")}</p>
                  <p className="text-caption">{t("dailyReminderDesc")}</p>
                </div>
              </div>
              <Switch
                checked={dailyReminderEnabled}
                onCheckedChange={handleDailyReminderToggle}
                disabled={!isNative}
              />
            </div>
            
            {dailyReminderEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <p className="text-caption mb-2">{t("reminderTime")}</p>
                <button
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className="w-full p-3 rounded-xl bg-secondary text-foreground text-left"
                >
                  {TIME_OPTIONS.find(t => t.key === reminderTime)?.label[lang] || reminderTime}
                </button>
                
                {showTimePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-1"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <button
                        key={time.key}
                        onClick={() => handleReminderTimeChange(time.key)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          reminderTime === time.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {time.label[lang]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Overspending Alert */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-body-medium text-foreground">{t("overspendingAlert")}</p>
                  <p className="text-caption">{t("overspendingDesc")}</p>
                </div>
              </div>
              <Switch
                checked={overspendingEnabled}
                onCheckedChange={handleOverspendingToggle}
                disabled={!isNative}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

HapticSettingsScreen.displayName = "HapticSettingsScreen";
