import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trophy, Flame, Target, Calendar, Check, X, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/context/AppContext";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isBefore, isAfter } from "date-fns";
import { useHaptic } from "@/hooks/useHaptic";

interface Challenge {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetDays: number;
  completedDays: string[];
  failedDays: string[];
  category?: string;
  isActive: boolean;
}

const TRANSLATIONS = {
  title: { en: "Spending Challenges", ru: "Челленджи расходов", uz: "Xarajat chellenjlari" },
  subtitle: { en: "Set weekly no-spend goals and track streaks", ru: "Установите еженедельные цели без трат", uz: "Haftalik xarajatsiz maqsadlarni belgilang" },
  newChallenge: { en: "New Challenge", ru: "Новый челлендж", uz: "Yangi chellenj" },
  activeChallenge: { en: "Active Challenge", ru: "Активный челлендж", uz: "Faol chellenj" },
  completedChallenges: { en: "Completed", ru: "Завершённые", uz: "Yakunlangan" },
  noSpendWeek: { en: "No-Spend Week", ru: "Неделя без трат", uz: "Xarajatsiz hafta" },
  noSpendWeekend: { en: "No-Spend Weekend", ru: "Выходные без трат", uz: "Xarajatsiz dam olish kunlari" },
  noEatingOut: { en: "No Eating Out", ru: "Без кафе/ресторанов", uz: "Tashqarida ovqatlanmaslik" },
  noOnlineShopping: { en: "No Online Shopping", ru: "Без онлайн покупок", uz: "Onlayn xarid qilmaslik" },
  custom: { en: "Custom Challenge", ru: "Свой челлендж", uz: "Maxsus chellenj" },
  currentStreak: { en: "Current Streak", ru: "Текущая серия", uz: "Joriy ketma-ketlik" },
  longestStreak: { en: "Longest Streak", ru: "Лучшая серия", uz: "Eng uzun ketma-ketlik" },
  daysCompleted: { en: "Days Completed", ru: "Дней выполнено", uz: "Tugatilgan kunlar" },
  markToday: { en: "How was today?", ru: "Как прошёл день?", uz: "Bugun qanday o'tdi?" },
  noSpend: { en: "No Spend! 🎉", ru: "Без трат! 🎉", uz: "Xarajat yo'q! 🎉" },
  didSpend: { en: "I Spent 😔", ru: "Потратил 😔", uz: "Sarfladim 😔" },
  congrats: { en: "Congratulations!", ru: "Поздравляем!", uz: "Tabriklaymiz!" },
  keepGoing: { en: "Keep going! You're doing great!", ru: "Продолжайте! У вас отлично получается!", uz: "Davom eting! Ajoyib!" },
  startChallenge: { en: "Start Challenge", ru: "Начать челлендж", uz: "Chellenjni boshlash" },
  days: { en: "days", ru: "дней", uz: "kun" },
  selectType: { en: "Select challenge type:", ru: "Выберите тип челленджа:", uz: "Chellenj turini tanlang:" },
  thisWeek: { en: "This Week", ru: "Эта неделя", uz: "Bu hafta" },
  cancel: { en: "Cancel", ru: "Отмена", uz: "Bekor qilish" },
  noChallenges: { en: "No active challenges", ru: "Нет активных челленджей", uz: "Faol chellenjlar yo'q" },
  startFirst: { en: "Start your first challenge!", ru: "Начните свой первый челлендж!", uz: "Birinchi chellenjingizni boshlang!" },
};

const CHALLENGE_PRESETS = [
  { id: "no-spend-week", icon: "🚫", days: 7 },
  { id: "no-spend-weekend", icon: "🏖️", days: 2 },
  { id: "no-eating-out", icon: "🍳", days: 7 },
  { id: "no-online-shopping", icon: "🛒", days: 7 },
  { id: "custom", icon: "✨", days: 7 },
];

export const SpendingChallengeScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { lang } = useApp();
  const { triggerLight, triggerSuccess, triggerError } = useHaptic();
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem("spending_challenges");
    return saved ? JSON.parse(saved) : [];
  });
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");

  const activeChallenge = challenges.find((c) => c.isActive);
  const completedChallenges = challenges.filter((c) => !c.isActive && c.completedDays.length > 0);

  useEffect(() => {
    localStorage.setItem("spending_challenges", JSON.stringify(challenges));
  }, [challenges]);

  const getPresetName = (presetId: string) => {
    const key = presetId.replace(/-/g, "") as keyof typeof TRANSLATIONS;
    switch (presetId) {
      case "no-spend-week": return TRANSLATIONS.noSpendWeek[lang];
      case "no-spend-weekend": return TRANSLATIONS.noSpendWeekend[lang];
      case "no-eating-out": return TRANSLATIONS.noEatingOut[lang];
      case "no-online-shopping": return TRANSLATIONS.noOnlineShopping[lang];
      case "custom": return customName || TRANSLATIONS.custom[lang];
      default: return presetId;
    }
  };

  const startChallenge = () => {
    if (!selectedPreset) return;
    triggerSuccess();

    const preset = CHALLENGE_PRESETS.find((p) => p.id === selectedPreset);
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const newChallenge: Challenge = {
      id: Date.now().toString(),
      name: getPresetName(selectedPreset),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      targetDays: preset?.days || 7,
      completedDays: [],
      failedDays: [],
      isActive: true,
    };

    // Deactivate any existing active challenge
    setChallenges((prev) => [
      ...prev.map((c) => ({ ...c, isActive: false })),
      newChallenge,
    ]);
    setShowNewChallenge(false);
    setSelectedPreset(null);
    setCustomName("");
  };

  const markDay = (success: boolean) => {
    if (!activeChallenge) return;
    
    if (success) {
      triggerSuccess();
    } else {
      triggerError();
    }

    const today = format(new Date(), "yyyy-MM-dd");
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id !== activeChallenge.id) return c;
        if (success) {
          return {
            ...c,
            completedDays: [...c.completedDays, today],
          };
        } else {
          return {
            ...c,
            failedDays: [...c.failedDays, today],
          };
        }
      })
    );
  };

  const calculateStreak = (challenge: Challenge) => {
    const sortedDays = [...challenge.completedDays].sort().reverse();
    let streak = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    
    for (let i = 0; i < sortedDays.length; i++) {
      const expected = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
      if (sortedDays.includes(expected)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const todayMarked = () => {
    if (!activeChallenge) return false;
    const today = format(new Date(), "yyyy-MM-dd");
    return activeChallenge.completedDays.includes(today) || activeChallenge.failedDays.includes(today);
  };

  const todaySuccess = () => {
    if (!activeChallenge) return false;
    const today = format(new Date(), "yyyy-MM-dd");
    return activeChallenge.completedDays.includes(today);
  };

  const getWeekDays = () => {
    if (!activeChallenge) return [];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 safe-area-inset">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { triggerLight(); onBack(); }} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{TRANSLATIONS.title[lang]}</h1>
          <p className="text-sm text-muted-foreground">{TRANSLATIONS.subtitle[lang]}</p>
        </div>
      </div>

      {/* Active Challenge */}
      {activeChallenge ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">{activeChallenge.name}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Flame className="w-5 h-5" />
                <span className="font-bold">{calculateStreak(activeChallenge)}</span>
              </div>
            </div>

            {/* Week Progress */}
            <div className="flex justify-between mb-4">
              {getWeekDays().map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCompleted = activeChallenge.completedDays.includes(dateStr);
                const isFailed = activeChallenge.failedDays.includes(dateStr);
                const isTodayDate = isToday(day);
                const isPast = isBefore(day, new Date()) && !isTodayDate;

                return (
                  <div key={dateStr} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {format(day, "EEE").slice(0, 2)}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isFailed
                          ? "bg-red-500 text-white"
                          : isTodayDate
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                          : isPast
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : isFailed ? <X className="w-4 h-4" /> : format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{TRANSLATIONS.daysCompleted[lang]}</span>
                <span className="font-medium text-foreground">
                  {activeChallenge.completedDays.length}/{activeChallenge.targetDays}
                </span>
              </div>
              <Progress value={(activeChallenge.completedDays.length / activeChallenge.targetDays) * 100} className="h-2" />
            </div>

            {/* Mark Today */}
            {!todayMarked() ? (
              <div className="space-y-2">
                <p className="text-center text-sm text-muted-foreground">{TRANSLATIONS.markToday[lang]}</p>
                <div className="flex gap-2">
                  <Button onClick={() => markDay(true)} className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                    <Check className="w-4 h-4 mr-2" />
                    {TRANSLATIONS.noSpend[lang]}
                  </Button>
                  <Button onClick={() => markDay(false)} variant="outline" className="flex-1 border-red-500 text-red-500 hover:bg-red-50">
                    <X className="w-4 h-4 mr-2" />
                    {TRANSLATIONS.didSpend[lang]}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                {todaySuccess() ? (
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">{TRANSLATIONS.keepGoing[lang]}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{lang === "en" ? "Tomorrow is a new day! 💪" : lang === "ru" ? "Завтра новый день! 💪" : "Ertaga yangi kun! 💪"}</p>
                )}
              </div>
            )}
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="p-4 text-center">
              <Flame className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{calculateStreak(activeChallenge)}</p>
              <p className="text-xs text-muted-foreground">{TRANSLATIONS.currentStreak[lang]}</p>
            </Card>
            <Card className="p-4 text-center">
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{activeChallenge.completedDays.length}</p>
              <p className="text-xs text-muted-foreground">{TRANSLATIONS.daysCompleted[lang]}</p>
            </Card>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{TRANSLATIONS.noChallenges[lang]}</h2>
          <p className="text-muted-foreground mb-6">{TRANSLATIONS.startFirst[lang]}</p>
          <Button onClick={() => { triggerLight(); setShowNewChallenge(true); }} className="bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            {TRANSLATIONS.newChallenge[lang]}
          </Button>
        </motion.div>
      )}

      {/* New Challenge Button (when active exists) */}
      {activeChallenge && (
        <Button onClick={() => { triggerLight(); setShowNewChallenge(true); }} variant="outline" className="w-full mb-6">
          <Plus className="w-4 h-4 mr-2" />
          {TRANSLATIONS.newChallenge[lang]}
        </Button>
      )}

      {/* New Challenge Modal */}
      {showNewChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
          onClick={() => setShowNewChallenge(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl h-[min(88dvh,720px)] sm:h-auto sm:max-h-[88vh] shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border">
              <h2 className="text-xl font-bold text-foreground mb-2">{TRANSLATIONS.newChallenge[lang]}</h2>
              <p className="text-muted-foreground">{TRANSLATIONS.selectType[lang]}</p>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              <div className="space-y-2">
                {CHALLENGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => { triggerLight(); setSelectedPreset(preset.id); }}
                    className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                      selectedPreset === preset.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">{preset.icon}</span>
                      <div className="text-left min-w-0">
                        <span className="text-foreground font-medium block truncate">{getPresetName(preset.id)}</span>
                        <span className="text-xs text-muted-foreground">{preset.days} {TRANSLATIONS.days[lang]}</span>
                      </div>
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPreset === preset.id ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {selectedPreset === preset.id && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                ))}
              </div>

              {selectedPreset === "custom" && (
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={lang === "en" ? "Challenge name..." : lang === "ru" ? "Название челленджа..." : "Chellenj nomi..."}
                />
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-border bg-background/95 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button variant="outline" onClick={() => setShowNewChallenge(false)} className="flex-1">
                {TRANSLATIONS.cancel[lang]}
              </Button>
              <Button onClick={startChallenge} disabled={!selectedPreset} className="flex-1 bg-primary">
                {TRANSLATIONS.startChallenge[lang]}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">{TRANSLATIONS.completedChallenges[lang]}</h2>
          <div className="space-y-3">
            {completedChallenges.slice(0, 5).map((challenge) => (
              <Card key={challenge.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{challenge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.completedDays.length}/{challenge.targetDays} {TRANSLATIONS.days[lang]}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-green-500">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">{Math.round((challenge.completedDays.length / challenge.targetDays) * 100)}%</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
