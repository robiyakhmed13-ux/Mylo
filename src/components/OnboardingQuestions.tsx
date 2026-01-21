import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Check, Rocket, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { LangKey } from "@/lib/constants";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface OnboardingQuestionsProps {
  lang: LangKey;
  onComplete: (answers: OnboardingAnswers) => void;
  onSkip: () => void;
}

export interface OnboardingAnswers {
  financialFeeling: string;
  spendingOn: string[];
  habitStrength: string;
  notificationsEnabled: boolean;
  reminderTime: string;
}

const QUESTIONS = {
  financialFeeling: {
    en: "How do you feel about your finances today?",
    ru: "Как вы оцениваете свои финансы сегодня?",
    uz: "Bugun moliyaviy ahvolingiz qanday?",
  },
  spendingOn: {
    en: "Who do you spend money on?",
    ru: "На кого вы тратите деньги?",
    uz: "Kimga pul sarflaysiz?",
  },
  habitStrength: {
    en: "How easy is it for you to stick to new habits?",
    ru: "Насколько легко вам придерживаться новых привычек?",
    uz: "Yangi odatlarga rioya qilish qanchalik oson?",
  },
};

const FEELING_OPTIONS = [
  { id: "stressed", emoji: "😫", en: "Stressed, I want to hide", ru: "В стрессе, хочу спрятаться", uz: "Stressda, yashirinmoqchiman" },
  { id: "unsure", emoji: "🤔", en: "Unsure - Not much direction", ru: "Не уверен - Нет направления", uz: "Ishonchsiz - Yo'nalish yo'q" },
  { id: "stable", emoji: "😊", en: "Stable - No fires to put out", ru: "Стабильно - Нет проблем", uz: "Barqaror - Muammolar yo'q" },
  { id: "confident", emoji: "💪", en: "Confident - Ready for my TED talk", ru: "Уверен - Готов к TED выступлению", uz: "Ishonchli - TED maʼruzasiga tayyorman" },
];

const SPENDING_OPTIONS = [
  { id: "myself", emoji: "🙌", en: "On myself", ru: "На себя", uz: "O'zimga" },
  { id: "partner", emoji: "❤️", en: "My partner", ru: "Мой партнёр", uz: "Sherigim" },
  { id: "adults", emoji: "👫", en: "Other adults", ru: "Другие взрослые", uz: "Boshqa kattalar" },
  { id: "kids", emoji: "👶", en: "Kids", ru: "Дети", uz: "Bolalar" },
  { id: "pets", emoji: "🐶", en: "Pets", ru: "Питомцы", uz: "Uy hayvonlari" },
  { id: "other", emoji: "🍀", en: "Other", ru: "Другое", uz: "Boshqa" },
];

const HABIT_OPTIONS = [
  { id: "pro", emoji: "🧠", en: "I'm a habit pro", ru: "Я профи в привычках", uz: "Men odat ustasiman" },
  { id: "fall-off", emoji: "😅", en: "I start strong but fall off", ru: "Начинаю сильно, но сдаюсь", uz: "Kuchli boshlayman, lekin to'xtayman" },
  { id: "reminders", emoji: "🔔", en: "Reminders really help me", ru: "Напоминания очень помогают", uz: "Eslatmalar juda yordam beradi" },
  { id: "what-habits", emoji: "🤔", en: "New habits? What are those?", ru: "Новые привычки? Что это?", uz: "Yangi odatlar? Bu nima?" },
];

const REMINDER_TIMES = [
  { id: "morning", time: "09:00", en: "Morning (9:00 AM)", ru: "Утро (9:00)", uz: "Ertalab (9:00)" },
  { id: "afternoon", time: "14:00", en: "Afternoon (2:00 PM)", ru: "День (14:00)", uz: "Tushdan keyin (14:00)" },
  { id: "evening", time: "20:00", en: "Evening (8:00 PM)", ru: "Вечер (20:00)", uz: "Kechqurun (20:00)" },
];

const TRANSLATIONS = {
  skip: { en: "Skip", ru: "Пропустить", uz: "O'tkazib yuborish" },
  continue: { en: "Continue", ru: "Продолжить", uz: "Davom etish" },
  enableNotifications: { en: "Enable Notifications", ru: "Включить уведомления", uz: "Bildirishnomalarni yoqish" },
  notificationTitle: {
    en: "🔔 Users who turn on reminders are 2x more consistent",
    ru: "🔔 Пользователи с напоминаниями в 2 раза последовательнее",
    uz: "🔔 Eslatmalarni yoqqan foydalanuvchilar 2 barobar izchilroq",
  },
  notificationDesc: {
    en: "MonEx helps you build strong financial habits by reminding you to check in, track progress, and stay on track—just a few seconds a week.",
    ru: "MonEx помогает формировать финансовые привычки, напоминая проверять расходы и следить за прогрессом — всего несколько секунд в неделю.",
    uz: "MonEx sizga xarajatlarni tekshirish va taraqqiyotni kuzatishni eslatib, mustahkam moliyaviy odatlar shakllantirishga yordam beradi.",
  },
  goalTitle: {
    en: "🚀 85% of users reach their goal with MonEx",
    ru: "🚀 85% пользователей достигают целей с MonEx",
    uz: "🚀 Foydalanuvchilarning 85% MonEx bilan maqsadiga erishadi",
  },
  goalDesc: {
    en: "Whether your goal is keeping your finances under control, improving spending habits or saving up for a vacation, MonEx is here for you.",
    ru: "Будь то контроль финансов, улучшение привычек трат или накопления на отпуск — MonEx поможет вам.",
    uz: "Maqsadingiz moliyani nazorat qilish, xarajat odatlarini yaxshilash yoki ta'tilga pul yig'ish bo'ladimi — MonEx siz bilan.",
  },
  selectTime: { en: "Choose reminder time:", ru: "Выберите время напоминания:", uz: "Eslatma vaqtini tanlang:" },
  savingsGrowth: { en: "Savings Growth", ru: "Рост сбережений", uz: "Jamg'armalar o'sishi" },
  withMonex: { en: "With MonEx", ru: "С MonEx", uz: "MonEx bilan" },
  withoutMonex: { en: "Without MonEx", ru: "Без MonEx", uz: "MonExsiz" },
};

export const OnboardingQuestions: React.FC<OnboardingQuestionsProps> = ({ lang, onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    financialFeeling: "",
    spendingOn: [],
    habitStrength: "",
    notificationsEnabled: false,
    reminderTime: "20:00",
  });

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.log("Haptic not available");
      }
    }
  };

  const handleNext = () => {
    triggerHaptic();
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFeelingSelect = (id: string) => {
    triggerHaptic();
    setAnswers({ ...answers, financialFeeling: id });
  };

  const handleSpendingToggle = (id: string) => {
    triggerHaptic();
    const current = answers.spendingOn;
    if (current.includes(id)) {
      setAnswers({ ...answers, spendingOn: current.filter((x) => x !== id) });
    } else {
      setAnswers({ ...answers, spendingOn: [...current, id] });
    }
  };

  const handleHabitSelect = (id: string) => {
    triggerHaptic();
    setAnswers({ ...answers, habitStrength: id });
  };

  const handleEnableNotifications = async () => {
    triggerHaptic();
    if (Capacitor.isNativePlatform()) {
      try {
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive === "granted") {
          await PushNotifications.register();
          setAnswers({ ...answers, notificationsEnabled: true });
          
          // Schedule daily reminder
          await LocalNotifications.schedule({
            notifications: [
              {
                title: "MonEx",
                body: lang === "ru" ? "Не забудьте записать расходы!" : lang === "uz" ? "Xarajatlarni yozishni unutmang!" : "Don't forget to record your expenses!",
                id: 1,
                schedule: {
                  on: { hour: parseInt(answers.reminderTime.split(":")[0]), minute: 0 },
                  repeats: true,
                },
              },
            ],
          });
        }
      } catch (e) {
        console.error("Notification permission error:", e);
      }
    }
    setAnswers({ ...answers, notificationsEnabled: true });
    handleNext();
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!answers.financialFeeling;
      case 1:
        return answers.spendingOn.length > 0;
      case 2:
        return !!answers.habitStrength;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">{QUESTIONS.financialFeeling[lang]}</h1>
            <div className="space-y-3">
              {FEELING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleFeelingSelect(option.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    answers.financialFeeling === option.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{option.emoji}</span>
                    <span className="text-foreground">{option[lang]}</span>
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answers.financialFeeling === option.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {answers.financialFeeling === option.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">{QUESTIONS.spendingOn[lang]}</h1>
            <div className="space-y-3">
              {SPENDING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSpendingToggle(option.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    answers.spendingOn.includes(option.id)
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{option.emoji}</span>
                    <span className="text-foreground">{option[lang]}</span>
                  </span>
                  <Checkbox checked={answers.spendingOn.includes(option.id)} />
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">{QUESTIONS.habitStrength[lang]}</h1>
            <div className="space-y-3">
              {HABIT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleHabitSelect(option.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    answers.habitStrength === option.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{option.emoji}</span>
                    <span className="text-foreground">{option[lang]}</span>
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answers.habitStrength === option.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {answers.habitStrength === option.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
            <Bell className="w-16 h-16 text-amber-500" />
            <h1 className="text-2xl font-bold text-foreground">{TRANSLATIONS.notificationTitle[lang]}</h1>
            <p className="text-muted-foreground">{TRANSLATIONS.notificationDesc[lang]}</p>
            
            <div className="w-full space-y-3 mt-4">
              <p className="text-sm font-medium text-foreground">{TRANSLATIONS.selectTime[lang]}</p>
              {REMINDER_TIMES.map((time) => (
                <button
                  key={time.id}
                  onClick={() => {
                    triggerHaptic();
                    setAnswers({ ...answers, reminderTime: time.time });
                  }}
                  className={`w-full p-3 rounded-xl border-2 transition-all ${
                    answers.reminderTime === time.time
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  {time[lang]}
                </button>
              ))}
            </div>

            <Button 
              onClick={handleEnableNotifications} 
              className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Bell className="w-5 h-5 mr-2" />
              {TRANSLATIONS.enableNotifications[lang]}
            </Button>
          </motion.div>
        );

      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
            {/* Savings Growth Chart */}
            <div className="w-full bg-card rounded-2xl p-4 border border-border shadow-lg">
              <h3 className="text-left font-semibold text-foreground mb-4">{TRANSLATIONS.savingsGrowth[lang]}</h3>
              <div className="relative h-32">
                {/* MonEx line (green, going up) */}
                <svg className="w-full h-full" viewBox="0 0 200 80">
                  {/* Without MonEx line */}
                  <path
                    d="M 10 60 Q 50 55 80 58 T 130 62 T 190 65"
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  {/* With MonEx line */}
                  <path
                    d="M 10 65 Q 40 50 70 45 T 120 30 T 180 15"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                  />
                  {/* Labels */}
                  <circle cx="150" cy="25" r="3" fill="hsl(var(--primary))" />
                  <circle cx="170" cy="60" r="3" fill="hsl(var(--muted-foreground))" />
                </svg>
                <div className="absolute top-4 right-4 flex flex-col gap-1 text-xs">
                  <span className="flex items-center gap-1 text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {TRANSLATIONS.withMonex[lang]}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    {TRANSLATIONS.withoutMonex[lang]}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{lang === "en" ? "Month 1" : lang === "ru" ? "Месяц 1" : "1-oy"}</span>
                <span>{lang === "en" ? "Month 6" : lang === "ru" ? "Месяц 6" : "6-oy"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Rocket className="w-10 h-10 text-amber-500" />
              <h1 className="text-2xl font-bold text-foreground">{TRANSLATIONS.goalTitle[lang]}</h1>
            </div>
            <p className="text-muted-foreground">{TRANSLATIONS.goalDesc[lang]}</p>

            <Button 
              onClick={handleNext} 
              className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {TRANSLATIONS.continue[lang]}
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-8 safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className={`w-10 h-10 rounded-full border border-border flex items-center justify-center ${step === 0 ? "opacity-0 pointer-events-none" : ""}`}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 mx-4">
          <Progress value={progress} className="h-2" />
        </div>
        {step < 3 && (
          <button onClick={onSkip} className="text-muted-foreground text-sm">
            {TRANSLATIONS.skip[lang]}
          </button>
        )}
        {step >= 3 && <div className="w-10" />}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>

      {/* Continue Button (for steps 0-2) */}
      {step < 3 && (
        <div className="fixed bottom-8 left-4 right-4">
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white"
          >
            {TRANSLATIONS.continue[lang]}
          </Button>
        </div>
      )}
    </div>
  );
};
